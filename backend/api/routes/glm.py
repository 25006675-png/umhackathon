from __future__ import annotations

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
    """Dedicated endpoint for multi-day trend analysis — bypasses chat wrapper."""
    if not orchestrator.client.is_configured:
        return ChatMessageResponse(reply="")
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
        reply = await orchestrator.client.complete(system_prompt, request.message, max_tokens=900)
        return ChatMessageResponse(reply=reply)
    except Exception as exc:
        print(f"[glm] trends call failed: {exc}", file=sys.stderr)
        return ChatMessageResponse(reply="")


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
