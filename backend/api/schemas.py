from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


RiskLevel = Literal["Low", "Moderate", "High", "Critical"]
RiskTrend = Literal["stable", "rising", "falling"]
AnalysisStatus = Literal["preliminary", "official"]


VentilationCondition = Literal["normal", "mild", "strong", "sensor_high"]
BehaviourFlag = Literal["water_change", "abnormal_sounds", "huddling_panting", "reduced_movement"]


class DailyReadingInput(BaseModel):
    farm_id: str = "farm_001"
    flock_id: str = "flock_2026_batch3"
    temperature_celsius: float | None = None
    feed_intake_kg: float | None = None
    mortality_count: int | None = None
    water_intake_liters: float | None = None
    ventilation_condition: Optional[VentilationCondition] = None
    behaviour_flags: list[BehaviourFlag] = Field(default_factory=list)
    farmer_notes: str = ""
    timestamp: datetime | None = None


class FarmSignals(BaseModel):
    temperature_celsius: float | None = None
    feed_intake_kg: float | None = None
    mortality_count: int | None = None
    water_intake_liters: float | None = None
    ventilation_condition: VentilationCondition = "normal"
    behaviour_flags: list[BehaviourFlag] = Field(default_factory=list)
    farmer_notes: str = ""


class FarmBaselines(BaseModel):
    temperature_celsius: float
    feed_intake_kg: float
    mortality_count: float
    water_intake_liters: float | None = None


class FarmDeviations(BaseModel):
    temperature: float
    feed_intake: float
    mortality: float


class RiskSummary(BaseModel):
    score: int = Field(ge=0, le=100)
    level: RiskLevel
    trend: RiskTrend = "stable"
    previous_scores: list[int] = Field(default_factory=list)
    breakdown: dict[str, Any] = Field(default_factory=dict)


class ProjectionSummary(BaseModel):
    mortality_range_percent: tuple[float, float]
    mortality_range_birds: tuple[int, int]
    financial_loss_rm: tuple[float, float]
    early_intervention_loss_rm: tuple[float, float]
    time_horizon_days: int = 5


class RiskAssessment(BaseModel):
    farm_id: str
    flock_id: str
    reading_date: date
    analysis_status: AnalysisStatus = "preliminary"
    check_count: int = 1
    day_completed_at: datetime | None = None
    flock_age_days: int
    flock_size: int
    timestamp: datetime
    signals: FarmSignals
    baselines: FarmBaselines
    deviations: FarmDeviations
    risk: RiskSummary
    projections: ProjectionSummary


class Citation(BaseModel):
    source: str
    section: str
    page: int | None = None
    relevance_score: float | None = None


class DiseaseHypothesis(BaseModel):
    disease: str
    confidence: float = Field(ge=0, le=1)
    reasoning: str
    matching_signals: list[str] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)


class RecommendedAction(BaseModel):
    priority: int
    action: str
    timeframe: str
    reason: str
    expected_impact: str


class ScenarioNarrative(BaseModel):
    no_action: str
    act_within_12_hours: str
    act_within_48_hours: str


class GLMAnalysisRequest(BaseModel):
    assessment: RiskAssessment | None = None
    farmer_constraints: dict[str, Any] = Field(default_factory=dict)
    language: Literal["en", "ms", "bilingual"] = "bilingual"
    use_live_glm: bool = True


class GLMAnalysis(BaseModel):
    flock_id: str
    generated_by: str
    interpretation: str
    hypotheses: list[DiseaseHypothesis]
    insight: str
    recommendations: list[RecommendedAction]
    constraint_adjusted_plan: list[RecommendedAction]
    narration: ScenarioNarrative
    raw_prompt_trace: dict[str, str] = Field(default_factory=dict)


class GLMComparison(BaseModel):
    flock_id: str
    without_glm: RiskAssessment
    with_glm: GLMAnalysis
    demo_message: str


class ChatRequest(BaseModel):
    question: str
    assessment: RiskAssessment | None = None
    language: Literal["en", "ms", "bilingual"] = "bilingual"


class ChatResponse(BaseModel):
    answer: str
    suggested_followups: list[str] = Field(default_factory=list)


class AlertResponse(BaseModel):
    alert_level: RiskLevel
    message: str
    recommended_actions: list[str] = Field(default_factory=list)


class FlockCreateInput(BaseModel):
    flock_id: str
    flock_size: int
    farm_id: str = "farm_001"
    age_days: int = 0
    start_date: date | None = None


class FeedbackInput(BaseModel):
    flock_id: str
    action_taken: str
    outcome: str


# Short-name aliases expected by analysis.py
Signals = FarmSignals
Baselines = FarmBaselines
Deviations = FarmDeviations
Risk = RiskSummary
Projections = ProjectionSummary
FarmDataResponse = RiskAssessment


# Frontend-facing simplified GLM shape (flattened strings for lists/narration)
class FrontendHypothesis(BaseModel):
    disease: str
    confidence: float = Field(ge=0, le=1)
    reasoning: str
    citations: list[str] = Field(default_factory=list)


class FrontendGLMAnalysis(BaseModel):
    interpretation: str
    hypothesis: list[FrontendHypothesis]
    recommendations: list[str]
    narration: str
    constraint_based_recs: list[str] = Field(default_factory=list)
    generated_at: str
    generated_by: str = "offline-glm-fallback"


class DayCompletionResponse(BaseModel):
    flock_id: str
    reading_date: date
    analysis_status: AnalysisStatus
    completed_at: datetime


class FrontendAlert(BaseModel):
    id: str
    flock_id: str
    risk_level: RiskLevel
    trigger: str
    immediate_action: str
    created_at: str
    active: bool = True


class ChatMessageRequest(BaseModel):
    message: str
    flock_id: str = "flock_2026_batch3"
    language: Literal["en", "ms", "bilingual"] = "bilingual"


class ChatMessageResponse(BaseModel):
    reply: str
