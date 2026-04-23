from __future__ import annotations

from fastapi import APIRouter

from api.schemas import (
    ChatRequest,
    ChatResponse,
    GLMAnalysis,
    GLMAnalysisRequest,
    GLMComparison,
)
from glm.orchestrator import GLMOrchestrator, build_demo_assessment


router = APIRouter(prefix="/api/glm", tags=["glm"])
orchestrator = GLMOrchestrator()


@router.post("/analyse/{flock_id}", response_model=GLMAnalysis)
async def analyse_flock(flock_id: str, request: GLMAnalysisRequest | None = None) -> GLMAnalysis:
    request = request or GLMAnalysisRequest()
    assessment = request.assessment or build_demo_assessment(flock_id)
    return await orchestrator.analyse(
        assessment=assessment,
        farmer_constraints=request.farmer_constraints,
        language=request.language,
        use_live_glm=request.use_live_glm,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    assessment = request.assessment or build_demo_assessment()
    answer = await orchestrator.chat(
        question=request.question,
        assessment=assessment,
        language=request.language,
    )
    return ChatResponse(
        answer=answer,
        suggested_followups=[
            "What should I do first?",
            "Why is the risk high?",
            "When should I call a vet?",
        ],
    )


@router.get("/compare/{flock_id}", response_model=GLMComparison)
async def compare_with_without_glm(flock_id: str) -> GLMComparison:
    assessment = build_demo_assessment(flock_id)
    analysis = await orchestrator.analyse(assessment=assessment, use_live_glm=True)
    return GLMComparison(
        flock_id=flock_id,
        without_glm=assessment,
        with_glm=analysis,
        demo_message=(
            "Without GLM, the system shows risk numbers only. With GLM, the same data becomes "
            "an explanation, ranked hypotheses, practical actions, and a scenario narrative."
        ),
    )
