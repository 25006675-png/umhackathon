from __future__ import annotations

from api.schemas import DiseaseHypothesis, RiskAssessment


SYSTEM_PROMPT = (
    "You are TernakAI's farm action planner. "
    "Return valid JSON only. No markdown, no code fences, no hidden reasoning."
)


def build_recommendation_prompt(
    assessment: RiskAssessment,
    hypotheses: list[DiseaseHypothesis],
) -> str:
    top = hypotheses[0].disease if hypotheses else "unclear disease pattern"
    return f"""
Task: generate a practical poultry farm action plan.
Return JSON only with this exact shape:
{{
  "recommendations": [
    {{
      "priority": 1,
      "action": "string",
      "timeframe": "string",
      "reason": "string",
      "expected_impact": "string"
    }}
  ]
}}

Risk: {assessment.risk.level} ({assessment.risk.score}/100), trend {assessment.risk.trend}
Top hypothesis: {top}
Projection without early intervention: {assessment.projections.mortality_range_birds} birds, RM {assessment.projections.financial_loss_rm}

Rules:
- Return 3 to 4 actions.
- Prioritise urgency and operational specificity.
- Use concrete time windows.
""".strip()


def build_action_call_prompt(
    assessment: RiskAssessment,
    hypotheses: list[DiseaseHypothesis],
    farmer_constraints: dict,
) -> str:
    top = hypotheses[0].disease if hypotheses else "unclear disease pattern"
    return f"""
Reply in this EXACT format. No extra text, no headers, no markdown.

ACTION_1: <action max 15 words> | <timeframe e.g. "Now to 2 hours"> | <reason max 15 words> | <expected impact max 15 words>
ACTION_2: <action max 15 words> | <timeframe> | <reason max 15 words> | <expected impact max 15 words>
ACTION_3: <action max 15 words> | <timeframe> | <reason max 15 words> | <expected impact max 15 words>
NO_ACTION: <one sentence, max 30 words, what happens if farmer does nothing>
ACT_12H: <one sentence, max 30 words, outcome if action starts within 12 hours>
ACT_48H: <one sentence, max 30 words, outcome if action waits 48 hours>

Farm context:
risk={assessment.risk.score}/100 ({assessment.risk.level}), trend={assessment.risk.trend}
top diagnosis: {top}
flock size: {assessment.flock_size}
mortality range no action: {assessment.projections.mortality_range_birds[0]}-{assessment.projections.mortality_range_birds[1]} birds
loss no action: RM {assessment.projections.financial_loss_rm[0]:.0f}-{assessment.projections.financial_loss_rm[1]:.0f}
loss early action: RM {assessment.projections.early_intervention_loss_rm[0]:.0f}-{assessment.projections.early_intervention_loss_rm[1]:.0f}
farmer constraints: {farmer_constraints or "none"}

Make actions concrete and prioritised by urgency.
""".strip()
