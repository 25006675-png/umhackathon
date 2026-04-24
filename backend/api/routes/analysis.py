from datetime import datetime

from fastapi import APIRouter, HTTPException

from api.schemas import Baselines, Deviations, FarmDataResponse, Projections, Risk, Signals
from database.db import add_alert, get_flock, get_readings
from engine.baseline import calculate_baselines, calculate_deviations
from engine.projection import calculate_projections
from engine.risk_scoring import calculate_risk


router = APIRouter()


def calculate_effective_flock_age_days(flock_info: dict, timestamp: str) -> int:
    start_date = flock_info.get("start_date")
    if start_date:
        start_date_value = datetime.fromisoformat(start_date).date()
        reading_date = datetime.fromisoformat(timestamp).date()
        return max(0, (reading_date - start_date_value).days)

    return flock_info["flock_age_days"]


def build_analysis(flock_id: str, persist_alert: bool = False):
    flock_info = get_flock(flock_id)
    history = get_readings(flock_id)
    if not flock_info or not history:
        raise HTTPException(status_code=404, detail="Flock or readings not found")

    current_reading = history[-1]
    effective_age_days = calculate_effective_flock_age_days(
        flock_info, current_reading["timestamp"]
    )

    baselines = calculate_baselines(
        history[:-1],
        current_age_days=effective_age_days,
        target_timestamp=current_reading.get("timestamp"),
    )
    deviations = calculate_deviations(current_reading, baselines)

    previous_scores = calculate_risk_trend(history[:-1], flock_info)
    risk = calculate_risk(deviations, previous_scores)

    if persist_alert and risk["level"] in ["High", "Critical"]:
        add_alert(flock_id, risk["level"], risk["score"])

    projections = calculate_projections(risk["level"], flock_info["flock_size"])

    return FarmDataResponse(
        farm_id=flock_info["farm_id"],
        flock_id=flock_id,
        flock_age_days=effective_age_days,
        flock_size=flock_info["flock_size"],
        timestamp=datetime.fromisoformat(current_reading["timestamp"]),
        signals=Signals(
            temperature_celsius=current_reading["temperature_celsius"],
            feed_intake_kg=current_reading["feed_intake_kg"],
            mortality_count=current_reading["mortality_count"],
            farmer_notes=current_reading.get("farmer_notes") or "",
        ),
        baselines=Baselines(**baselines),
        deviations=Deviations(**deviations),
        risk=Risk(**risk),
        projections=Projections(**projections),
    )


def calculate_risk_trend(history: list, flock_info: dict):
    scores = []
    for index in range(1, len(history)):
        effective_age_days = calculate_effective_flock_age_days(
            flock_info, history[index]["timestamp"]
        )
        baselines = calculate_baselines(
            history[:index],
            current_age_days=effective_age_days,
            target_timestamp=history[index].get("timestamp"),
        )
        deviations = calculate_deviations(history[index], baselines)
        risk = calculate_risk(deviations, scores)
        scores.append(risk["score"])
    return scores[-3:]


@router.get("/api/analysis/{flock_id}", response_model=FarmDataResponse)
async def get_full_analysis(flock_id: str):
    return build_analysis(flock_id, persist_alert=True)


@router.get("/api/analysis/{flock_id}/trend")
async def get_analysis_trend(flock_id: str):
    if not get_flock(flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    flock_info = get_flock(flock_id)
    history = get_readings(flock_id)
    if not history:
        raise HTTPException(status_code=404, detail="Readings not found")
    return {"flock_id": flock_id, "risk_scores": calculate_risk_trend(history, flock_info)}


@router.get("/api/analysis/{flock_id}/raw")
async def get_raw_analysis(flock_id: str):
    return build_analysis(flock_id)
