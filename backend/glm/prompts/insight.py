from __future__ import annotations

from api.schemas import DiseaseHypothesis, RiskAssessment


SYSTEM_PROMPT = (
    "Synthesize cross-signal poultry farm patterns into a concise forward-looking insight."
)


def build_insight_prompt(
    assessment: RiskAssessment,
    hypotheses: list[DiseaseHypothesis],
) -> str:
    top = hypotheses[0].disease if hypotheses else "the current risk pattern"
    return f"""
Risk trend: {assessment.risk.trend}
Previous scores: {assessment.risk.previous_scores}
Top hypothesis: {top}
Feed deviation: {assessment.deviations.feed_intake:.1%}
Temperature deviation: {assessment.deviations.temperature:.1%}
Mortality deviation: {assessment.deviations.mortality}

State the most important forward-looking insight in one or two sentences.
""".strip()
