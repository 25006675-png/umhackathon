from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from api.routes.analysis import build_analysis, build_analysis_for_date, build_trajectory
from api.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    FrontendGLMAnalysis,
    FrontendHypothesis,
    GLMAnalysis,
    RiskAssessment,
)
from glm.orchestrator import GLMOrchestrator, build_demo_assessment


router = APIRouter(prefix="/api/glm", tags=["glm"])
orchestrator = GLMOrchestrator()
TREND_SECTION_TIMEOUT_SECONDS = 180


def _assessment_for(flock_id: str, reading_date: str | None = None) -> RiskAssessment:
    """Prefer real assessment from P1 engine; fall back to demo scenario."""
    try:
        if reading_date:
            return build_analysis_for_date(flock_id, reading_date)
        return build_analysis(flock_id)
    except HTTPException:
        return build_demo_assessment(flock_id)
    except Exception:
        return build_demo_assessment(flock_id)


def _trajectory_for(flock_id: str, reading_date: str | None) -> dict:
    try:
        target = reading_date
        if not target:
            from database.db import get_latest_daily_summary  # local import to avoid cycles
            latest = get_latest_daily_summary(flock_id)
            target = latest["reading_date"] if latest else None
        if not target:
            return {"days": [], "direction": "stable", "consecutive_worsening_days": 0}
        return build_trajectory(flock_id, target, window=5)
    except Exception:
        return {"days": [], "direction": "stable", "consecutive_worsening_days": 0}


def _to_frontend(analysis: GLMAnalysis) -> FrontendGLMAnalysis:
    narration_parts = [
        f"Without action: {analysis.narration.no_action}",
        f"Act within 12h: {analysis.narration.act_within_12_hours}",
        f"Act within 48h: {analysis.narration.act_within_48_hours}",
    ]
    return FrontendGLMAnalysis(
        interpretation=analysis.interpretation,
        hypothesis=[
            FrontendHypothesis(
                disease=h.disease,
                confidence=h.confidence,
                reasoning=h.reasoning,
                citations=[f"{c.source} — {c.section}" for c in h.citations],
            )
            for h in analysis.hypotheses
        ],
        recommendations=[a.action for a in analysis.recommendations],
        narration="\n\n".join(narration_parts),
        constraint_based_recs=[a.action for a in analysis.constraint_adjusted_plan],
        generated_at=datetime.now(timezone.utc).isoformat(),
        generated_by=analysis.generated_by,
    )


@router.post("/analyse/{flock_id}", response_model=FrontendGLMAnalysis)
async def analyse_flock(flock_id: str, date: str | None = None) -> FrontendGLMAnalysis:
    assessment = _assessment_for(flock_id, reading_date=date)
    trajectory = _trajectory_for(flock_id, date)
    analysis = await orchestrator.analyse(
        assessment=assessment,
        use_live_glm=True,
        trajectory=trajectory,
    )
    return _to_frontend(analysis)


@router.post("/chat", response_model=ChatMessageResponse)
async def chat(request: ChatMessageRequest) -> ChatMessageResponse:
    assessment = _assessment_for(request.flock_id)
    answer = await orchestrator.chat(
        question=request.message,
        assessment=assessment,
        language=request.language,
    )
    return ChatMessageResponse(reply=answer)


@router.post("/trends/{flock_id}", response_model=ChatMessageResponse)
async def trends_analysis(flock_id: str, request: ChatMessageRequest) -> ChatMessageResponse:
    assessment = _assessment_for(flock_id)
    trajectory = _trajectory_for(flock_id, None)
    fallback = _build_trends_fallback_sections(assessment, trajectory)

    if not orchestrator.client.is_configured:
        return ChatMessageResponse(reply=_combine_trend_sections(fallback))

    context = _build_trend_context(assessment, trajectory)
    pattern = await _complete_trend_section(
        section="Pattern Analysis",
        system_prompt=(
            "You are a poultry farm trend analyst. Write 2 concise sentences only. "
            "Identify the earliest signal change, linked variables, and whether the flock is worsening, stabilizing, or recovering. "
            "Do not include a heading, actions, diagnosis, markdown, or projected losses."
        ),
        user_prompt=context,
        max_tokens=700,
        fallback=fallback["Pattern Analysis"],
    )
    actions = await _complete_trend_section(
        section="Recommended Next Actions",
        system_prompt=(
            "You are a poultry farm action planner. Give exactly 4 numbered actions. "
            "Each action must include the tool or resource needed, timeframe, and expected outcome. "
            "Do not include a heading or markdown. Be specific to the supplied trend pattern."
        ),
        user_prompt=f"{context}\n\nPattern summary to act on:\n{pattern}",
        max_tokens=700,
        fallback=fallback["Recommended Next Actions"],
    )
    actions = _ensure_complete_actions(actions, fallback["Recommended Next Actions"])
    return ChatMessageResponse(
        reply=_combine_trend_sections(
            {
                "Pattern Analysis": pattern,
                "Recommended Next Actions": actions,
                "Projected Scenario": fallback["Projected Scenario"],
            }
        )
    )

    """Dedicated endpoint for multi-day trend analysis — bypasses chat wrapper."""
    if not orchestrator.client.is_configured:
        return ChatMessageResponse(reply=_build_trends_fallback(flock_id))
    system_prompt = (
        "You are a poultry farm risk analyst. "
        "Analyse multi-day farm data and respond with EXACTLY these three section headers, each on its own line:\n"
        "Pattern Analysis:\n"
        "Recommended Next Actions:\n"
        "Projected Scenario:\n"
        "Do not add any other headers, titles, or markdown decorators. "
        "Pattern Analysis: identify which signals changed first, which variables moved together, and overall flock direction. "
        "Recommended Next Actions: numbered list, each action MUST include: (a) the specific tool or resource needed, "
        "(b) the exact timeframe to act (e.g. within 2 hours, within 12 hours), and "
        "(c) the concrete expected outcome if done. Minimum 4 actions, maximum 6. Be specific to the data — no generic advice. "
        "Projected Scenario: concrete mortality % and RM financial loss estimate if no action taken within 7 days. "
        "Be data-specific. Write in English."
    )
    try:
        reply = await orchestrator.client.complete(system_prompt, request.message, max_tokens=700, stream=True)
        return ChatMessageResponse(reply=reply or _build_trends_fallback(flock_id))
    except Exception as exc:
        print(f"[glm] trends call failed: {exc}", file=sys.stderr)
        return ChatMessageResponse(reply=_build_trends_fallback(flock_id))


async def _complete_trend_section(
    *,
    section: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    fallback: str,
) -> str:
    try:
        reply = await asyncio.wait_for(
            orchestrator.client.complete(
                system_prompt,
                user_prompt,
                max_tokens=max_tokens,
                stream=False,
            ),
            timeout=TREND_SECTION_TIMEOUT_SECONDS,
        )
        return _normalize_trend_section(section, reply, fallback)
    except Exception as exc:
        print(f"[glm] trends {section} failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return fallback


def _normalize_trend_section(section: str, value: str | None, fallback: str) -> str:
    text = (value or "").strip()
    if not text:
        return fallback
    header = f"{section}:"
    if text.lower().startswith(header.lower()):
        return text
    return f"{header} {text}"


def _combine_trend_sections(sections: dict[str, str]) -> str:
    return "\n".join(
        [
            _normalize_trend_section("Pattern Analysis", sections.get("Pattern Analysis"), ""),
            _normalize_trend_section("Recommended Next Actions", sections.get("Recommended Next Actions"), ""),
            _normalize_trend_section("Projected Scenario", sections.get("Projected Scenario"), ""),
        ]
    ).strip()


def _ensure_complete_actions(value: str, fallback: str) -> str:
    numbered_steps = sum(1 for marker in ("1.", "2.", "3.") if marker in value)
    return value if numbered_steps >= 3 else fallback


def _build_trend_context(assessment: RiskAssessment, trajectory: dict) -> str:
    compact_days = trajectory.get("days") or []
    trajectory_lines = [
        (
            f"{day.get('reading_date')}: risk {day.get('score')} ({day.get('level')}), "
            f"feed {day.get('feed_pct_vs_baseline')}% vs baseline, "
            f"temp {day.get('temp_delta_c')}C, mortality {day.get('mortality')}, "
            f"driver {day.get('top_driver')}"
        )
        for day in compact_days[-7:]
    ]
    return (
        f"Current risk: {assessment.risk.score} ({assessment.risk.level}), trend {assessment.risk.trend}\n"
        f"Flock size: {assessment.flock_size}, age {assessment.flock_age_days} days\n"
        f"Latest signals: temp {assessment.signals.temperature_celsius}C, "
        f"feed {assessment.signals.feed_intake_kg}kg, water {assessment.signals.water_intake_liters or 'n/a'}, "
        f"mortality {assessment.signals.mortality_count}, ventilation {assessment.signals.ventilation_condition}, "
        f"behaviour {assessment.signals.behaviour_flags or []}, notes {assessment.signals.farmer_notes or 'none'}\n"
        f"Backend trajectory:\n{chr(10).join(trajectory_lines) or 'No trajectory available.'}"
    )


def _build_trends_fallback_sections(assessment: RiskAssessment, trajectory: dict) -> dict[str, str]:
    days = trajectory.get("days") or []
    first = days[0] if days else None
    last = days[-1] if days else None
    direction = trajectory.get("direction") or assessment.risk.trend

    if first and last:
        risk_phrase = f"risk moved from {first['score']} to {last['score']}"
        driver_phrase = f"Latest top driver is {last.get('top_driver') or 'Normal'}."
    else:
        risk_phrase = f"current risk is {assessment.risk.score} ({assessment.risk.level})"
        driver_phrase = "There is not enough multi-day history to rank a first signal confidently."

    signals = assessment.signals
    projection = assessment.projections
    pattern = (
        f"Pattern Analysis: The flock trend is {direction}; {risk_phrase}. "
        f"Current readings show feed {signals.feed_intake_kg or 'not logged'} kg, "
        f"temperature {signals.temperature_celsius or 'not logged'} C, "
        f"mortality {signals.mortality_count or 0}, "
        f"ventilation {signals.ventilation_condition or 'normal'}, and "
        f"{len(signals.behaviour_flags or [])} behaviour flag(s). {driver_phrase}"
    )
    actions = (
        "Recommended Next Actions: "
        "1. Use shed ventilation controls within 2 hours to reduce heat and air-quality pressure; expected outcome is lower immediate stress. "
        "2. Use the water-line and feed-tray checklist within 6 hours to confirm intake recovery; expected outcome is clearer separation of supply issues from disease pressure. "
        "3. Use visual bird inspection within 6 hours to check coughing, panting, huddling, weak birds, and wet litter; expected outcome is better triage. "
        "4. Contact a poultry veterinarian or local animal health officer within 12 hours if mortality or intake worsens; expected outcome is faster clinical confirmation."
    )
    scenario = (
        f"Projected Scenario: Without intervention, estimated mortality is "
        f"{projection.mortality_range_percent[0]}-{projection.mortality_range_percent[1]}% "
        f"({projection.mortality_range_birds[0]}-{projection.mortality_range_birds[1]} birds) "
        f"over {projection.time_horizon_days} days, with financial loss of "
        f"RM {projection.financial_loss_rm[0]:,.0f}-{projection.financial_loss_rm[1]:,.0f}. "
        f"Early action could reduce losses to RM "
        f"{projection.early_intervention_loss_rm[0]:,.0f}-{projection.early_intervention_loss_rm[1]:,.0f}."
    )
    return {
        "Pattern Analysis": pattern,
        "Recommended Next Actions": actions,
        "Projected Scenario": scenario,
    }


def _build_trends_fallback(flock_id: str) -> str:
    assessment = _assessment_for(flock_id)
    trajectory = _trajectory_for(flock_id, None)
    days = trajectory.get("days") or []
    first = days[0] if days else None
    last = days[-1] if days else None
    direction = trajectory.get("direction") or assessment.risk.trend

    if first and last:
        risk_phrase = f"risk moved from {first['score']} to {last['score']}"
        driver_phrase = f"Latest top driver is {last.get('top_driver') or 'Normal'}."
    else:
        risk_phrase = f"current risk is {assessment.risk.score} ({assessment.risk.level})"
        driver_phrase = "There is not enough multi-day history to rank a first signal confidently."

    signals = assessment.signals
    projection = assessment.projections
    pattern = (
        f"Pattern Analysis: The flock trend is {direction}; {risk_phrase}. "
        f"Current readings show feed {signals.feed_intake_kg or 'not logged'} kg, "
        f"temperature {signals.temperature_celsius or 'not logged'} C, "
        f"mortality {signals.mortality_count or 0}, "
        f"ventilation {signals.ventilation_condition or 'normal'}, and "
        f"{len(signals.behaviour_flags or [])} behaviour flag(s). {driver_phrase}"
    )
    actions = (
        "Recommended Next Actions: "
        "1. Use shed ventilation controls within 2 hours to reduce heat and air-quality pressure; expected outcome is lower immediate stress. "
        "2. Use the water-line and feed-tray checklist within 6 hours to confirm intake recovery; expected outcome is clearer separation of supply issues from disease pressure. "
        "3. Use visual bird inspection within 6 hours to check coughing, panting, huddling, weak birds, and wet litter; expected outcome is better triage. "
        "4. Contact a poultry veterinarian or local animal health officer within 12 hours if mortality or intake worsens; expected outcome is faster clinical confirmation."
    )
    scenario = (
        f"Projected Scenario: Without intervention, estimated mortality is "
        f"{projection.mortality_range_percent[0]}-{projection.mortality_range_percent[1]}% "
        f"({projection.mortality_range_birds[0]}-{projection.mortality_range_birds[1]} birds) "
        f"over {projection.time_horizon_days} days, with financial loss of "
        f"RM {projection.financial_loss_rm[0]:,.0f}-{projection.financial_loss_rm[1]:,.0f}. "
        f"Early action could reduce losses to RM "
        f"{projection.early_intervention_loss_rm[0]:,.0f}-{projection.early_intervention_loss_rm[1]:,.0f}."
    )
    return "\n".join([pattern, actions, scenario])


@router.get("/compare/{flock_id}")
async def compare_with_without_glm(flock_id: str) -> dict:
    assessment = _assessment_for(flock_id)
    trajectory = _trajectory_for(flock_id, None)
    analysis = await orchestrator.analyse(
        assessment=assessment,
        use_live_glm=True,
        trajectory=trajectory,
    )
    return {
        "flock_id": flock_id,
        "without_glm": assessment.model_dump(mode="json"),
        "with_glm": _to_frontend(analysis).model_dump(mode="json"),
        "demo_message": (
            "Without GLM, the system shows risk numbers only. "
            "With GLM, the same data becomes explanation, ranked hypotheses, actions, and scenarios."
        ),
    }
