from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from api.routes.analysis import build_analysis
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


def _assessment_for(flock_id: str) -> RiskAssessment:
    """Prefer real assessment from P1 engine; fall back to demo scenario."""
    try:
        return build_analysis(flock_id)
    except HTTPException:
        return build_demo_assessment(flock_id)
    except Exception:
        return build_demo_assessment(flock_id)


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
async def analyse_flock(flock_id: str) -> FrontendGLMAnalysis:
    assessment = _assessment_for(flock_id)
    analysis = await orchestrator.analyse(assessment=assessment, use_live_glm=True)
    return _to_frontend(analysis)


@router.post("/chat", response_model=ChatMessageResponse)
async def chat(request: ChatMessageRequest) -> ChatMessageResponse:
    assessment = _assessment_for(request.flock_id)
    answer = await orchestrator.chat(question=request.message, assessment=assessment)
    return ChatMessageResponse(reply=answer)


@router.get("/compare/{flock_id}")
async def compare_with_without_glm(flock_id: str) -> dict:
    assessment = _assessment_for(flock_id)
    analysis = await orchestrator.analyse(assessment=assessment, use_live_glm=True)
    return {
        "flock_id": flock_id,
        "without_glm": assessment.model_dump(mode="json"),
        "with_glm": _to_frontend(analysis).model_dump(mode="json"),
        "demo_message": (
            "Without GLM, the system shows risk numbers only. "
            "With GLM, the same data becomes explanation, ranked hypotheses, actions, and scenarios."
        ),
    }
