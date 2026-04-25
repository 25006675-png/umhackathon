from datetime import datetime

from fastapi import APIRouter, HTTPException

from api.schemas import Baselines, Deviations, FarmDataResponse, Projections, Risk, Signals
from database.db import add_alert, get_daily_summaries, get_flock, get_latest_daily_summary
from engine.baseline import DEFAULT_BASELINES, calculate_baselines, calculate_deviations
from engine.projection import calculate_projections
from engine.risk_scoring import calculate_risk


router = APIRouter()


def calculate_effective_flock_age_days(flock_info: dict, reading_date: str) -> int:
    start_date = flock_info.get("start_date")
    if start_date:
        start_date_value = datetime.fromisoformat(start_date).date()
        current_date = datetime.fromisoformat(reading_date).date()
        return max(0, (current_date - start_date_value).days)
    return flock_info["flock_age_days"]


def _signals_from_summary(summary: dict) -> dict:
    return {
        "temperature_celsius": summary["avg_temperature_celsius"],
        "feed_intake_kg": summary["feed_intake_kg"],
        "mortality_count": summary["mortality_count"],
        "water_intake_liters": summary.get("water_intake_liters"),
        "ventilation_condition": summary.get("ventilation_condition") or "normal",
        "behaviour_flags": summary.get("behaviour_flags") or [],
        "farmer_notes": summary.get("farmer_notes") or "",
    }


def _summary_as_baseline_reading(summary: dict) -> dict:
    return {
        "timestamp": summary["last_check_at"],
        "temperature_celsius": summary["avg_temperature_celsius"],
        "feed_intake_kg": summary["feed_intake_kg"],
        "mortality_count": summary["mortality_count"],
        "water_intake_liters": summary.get("water_intake_liters"),
    }


def _build_analysis_from_summary(
    flock_id: str,
    flock_info: dict,
    current_summary: dict,
    previous_summaries: list[dict],
    persist_alert: bool = False,
):
    effective_age_days = calculate_effective_flock_age_days(
        flock_info, current_summary["reading_date"]
    )
    baseline_readings = [_summary_as_baseline_reading(item) for item in previous_summaries]
    baselines = calculate_baselines(
        baseline_readings,
        current_age_days=effective_age_days,
        target_timestamp=current_summary.get("last_check_at"),
    )
    deviations = calculate_deviations(_signals_from_summary(current_summary), baselines)

    previous_scores, category_history = calculate_risk_trend(previous_summaries, flock_info)
    current_signals = _signals_from_summary(current_summary)
    risk = calculate_risk(
        current_signals,
        baselines,
        flock_info["flock_size"],
        previous_scores=previous_scores,
        category_history=category_history,
    )

    if persist_alert and current_summary["status"] == "official" and risk["level"] in ["High", "Critical"]:
        add_alert(flock_id, risk["level"], risk["score"])

    projections = calculate_projections(risk["level"], flock_info["flock_size"])

    return FarmDataResponse(
        farm_id=flock_info["farm_id"],
        flock_id=flock_id,
        reading_date=datetime.fromisoformat(current_summary["reading_date"]).date(),
        analysis_status=current_summary["status"],
        check_count=current_summary["check_count"],
        day_completed_at=(
            datetime.fromisoformat(current_summary["completed_at"])
            if current_summary.get("completed_at")
            else None
        ),
        flock_age_days=effective_age_days,
        flock_size=flock_info["flock_size"],
        timestamp=datetime.fromisoformat(current_summary["last_check_at"]),
        signals=Signals(**current_signals),
        baselines=Baselines(**baselines),
        deviations=Deviations(**deviations),
        risk=Risk(**risk),
        projections=Projections(**projections),
    )


def build_analysis(flock_id: str, persist_alert: bool = False):
    flock_info = get_flock(flock_id)
    current_summary = get_latest_daily_summary(flock_id)
    if not flock_info or not current_summary:
        raise HTTPException(status_code=404, detail="Flock or daily summary not found")

    summaries = get_daily_summaries(flock_id)
    previous_summaries = [
        item for item in summaries if item["reading_date"] < current_summary["reading_date"]
    ]
    return _build_analysis_from_summary(
        flock_id,
        flock_info,
        current_summary,
        previous_summaries,
        persist_alert=persist_alert,
    )


def build_analysis_for_date(flock_id: str, reading_date: str, persist_alert: bool = False):
    flock_info = get_flock(flock_id)
    if not flock_info:
        raise HTTPException(status_code=404, detail="Flock not found")
    summaries = get_daily_summaries(flock_id)
    target = next((item for item in summaries if item["reading_date"] == reading_date), None)
    if not target:
        raise HTTPException(
            status_code=404,
            detail=f"No daily summary for {flock_id} on {reading_date}",
        )
    previous_summaries = [item for item in summaries if item["reading_date"] < reading_date]
    return _build_analysis_from_summary(
        flock_id,
        flock_info,
        target,
        previous_summaries,
        persist_alert=persist_alert,
    )


def _top_driver(deviations: dict, signals: dict) -> str:
    """Pick the category contributing most to risk, as a short human-readable phrase."""
    candidates = [
        ("Feed drop", abs(deviations.get("feed_intake") or 0.0) * 2.0),
        ("Temperature", abs(deviations.get("temperature") or 0.0) * 1.5),
        ("Mortality", min(1.0, (deviations.get("mortality") or 0.0) / 5.0) * 2.5),
    ]
    if signals.get("behaviour_flags"):
        candidates.append(("Behaviour", 0.5 + 0.15 * len(signals["behaviour_flags"])))
    if (signals.get("ventilation_condition") or "normal") != "normal":
        candidates.append(("Ventilation", 0.6))
    label, magnitude = max(candidates, key=lambda item: item[1])
    if magnitude < 0.1:
        return "Normal"
    return label


def build_trajectory(flock_id: str, current_reading_date: str, window: int = 5):
    """Compact multi-day context for GLM reasoning."""
    flock_info = get_flock(flock_id)
    if not flock_info:
        return {"days": [], "direction": "stable", "consecutive_worsening_days": 0}
    summaries = get_daily_summaries(flock_id)
    relevant = [item for item in summaries if item["reading_date"] <= current_reading_date]
    relevant = relevant[-window:]

    days: list[dict] = []
    prev_scores: list[int] = []
    for index, summary in enumerate(relevant):
        baseline_readings = [
            _summary_as_baseline_reading(item) for item in summaries if item["reading_date"] < summary["reading_date"]
        ]
        effective_age_days = calculate_effective_flock_age_days(flock_info, summary["reading_date"])
        baselines = calculate_baselines(
            baseline_readings,
            current_age_days=effective_age_days,
            target_timestamp=summary.get("last_check_at"),
        )
        signals = _signals_from_summary(summary)
        deviations = calculate_deviations(signals, baselines)
        risk = calculate_risk(
            signals,
            baselines,
            flock_info["flock_size"],
            previous_scores=prev_scores,
        )
        prev_scores.append(risk["score"])
        days.append(
            {
                "reading_date": summary["reading_date"],
                "score": risk["score"],
                "level": risk["level"],
                "feed_pct_vs_baseline": round(deviations["feed_intake"] * 100, 1),
                "temp_delta_c": round((signals["temperature_celsius"] or baselines["temperature_celsius"]) - baselines["temperature_celsius"], 2),
                "mortality": signals["mortality_count"],
                "top_driver": _top_driver(deviations, signals),
            }
        )

    # Trajectory summary
    consecutive = 1
    for i in range(len(days) - 1, 0, -1):
        if days[i]["score"] > days[i - 1]["score"]:
            consecutive += 1
        else:
            break
    if len(days) >= 2:
        delta = days[-1]["score"] - days[-2]["score"]
        direction = "rising" if delta > 2 else "falling" if delta < -2 else "stable"
    else:
        direction = "stable"

    return {
        "days": days,
        "direction": direction,
        "consecutive_worsening_days": consecutive if len(days) >= 2 and direction == "rising" else 0,
    }


def calculate_risk_trend(summaries: list[dict], flock_info: dict):
    scores: list[int] = []
    category_history: dict[str, list[int]] = {
        "feed": [],
        "water": [],
        "temperature": [],
        "mortality": [],
        "air_quality": [],
        "behaviour": [],
    }
    for index in range(1, len(summaries)):
        summary = summaries[index]
        effective_age_days = calculate_effective_flock_age_days(
            flock_info, summary["reading_date"]
        )
        baselines = calculate_baselines(
            [_summary_as_baseline_reading(item) for item in summaries[:index]],
            current_age_days=effective_age_days,
            target_timestamp=summary.get("last_check_at"),
        )
        signals = _signals_from_summary(summary)
        risk = calculate_risk(
            signals,
            baselines,
            flock_info["flock_size"],
            previous_scores=scores,
            category_history=category_history,
        )
        scores.append(risk["score"])
        for cat, val in risk["category_scores"].items():
            category_history[cat].append(val)
    trimmed_history = {cat: vals[-3:] for cat, vals in category_history.items()}
    return scores[-3:], trimmed_history


@router.get("/api/analysis/{flock_id}", response_model=FarmDataResponse)
async def get_full_analysis(flock_id: str):
    return build_analysis(flock_id, persist_alert=True)


@router.get("/api/analysis/{flock_id}/trend")
async def get_analysis_trend(flock_id: str):
    flock_info = get_flock(flock_id)
    if not flock_info:
        raise HTTPException(status_code=404, detail="Flock not found")
    summaries = get_daily_summaries(flock_id)
    if not summaries:
        raise HTTPException(status_code=404, detail="Daily summaries not found")
    scores, _ = calculate_risk_trend(summaries, flock_info)
    current = _build_analysis_from_summary(
        flock_id,
        flock_info,
        summaries[-1],
        summaries[:-1],
    )
    return {"flock_id": flock_id, "risk_scores": current.risk.previous_scores}


@router.get("/api/analysis/{flock_id}/raw")
async def get_raw_analysis(flock_id: str):
    return build_analysis(flock_id)


@router.get("/api/analysis/{flock_id}/history")
async def get_reading_history(flock_id: str, days: int = 30):
    flock_info = get_flock(flock_id)
    if not flock_info:
        raise HTTPException(status_code=404, detail="Flock not found")
    summaries = get_daily_summaries(flock_id)
    if not summaries:
        return {"flock_id": flock_id, "entries": []}

    entries = []
    for index in range(len(summaries)):
        analysis = _build_analysis_from_summary(
            flock_id,
            flock_info,
            summaries[index],
            summaries[:index],
        )
        signals_dict = _signals_from_summary(summaries[index])
        deviations_dict = {
            "temperature": analysis.deviations.temperature,
            "feed_intake": analysis.deviations.feed_intake,
            "mortality": analysis.deviations.mortality,
        }
        entries.append(
            {
                "timestamp": summaries[index]["last_check_at"],
                "reading_date": summaries[index]["reading_date"],
                "score": analysis.risk.score,
                "level": analysis.risk.level,
                "mortality": summaries[index]["mortality_count"],
                "status": summaries[index]["status"],
                "check_count": summaries[index]["check_count"],
                "temperature_celsius": summaries[index]["avg_temperature_celsius"],
                "feed_intake_kg": summaries[index]["feed_intake_kg"],
                "water_intake_liters": summaries[index].get("water_intake_liters"),
                "ventilation_condition": summaries[index].get("ventilation_condition"),
                "behaviour_flags": summaries[index].get("behaviour_flags") or [],
                "farmer_notes": summaries[index].get("farmer_notes") or "",
                "top_driver": _top_driver(deviations_dict, signals_dict),
            }
        )
    return {"flock_id": flock_id, "entries": entries[-days:]}
