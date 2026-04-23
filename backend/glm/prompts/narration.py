from __future__ import annotations

from api.schemas import RiskAssessment


SYSTEM_PROMPT = (
    "Translate mortality and financial projections into a clear decision narrative "
    "comparing no action, immediate action, and delayed action."
)


def build_narration_prompt(assessment: RiskAssessment) -> str:
    return f"""
Flock size: {assessment.flock_size}
Time horizon: {assessment.projections.time_horizon_days} days
No-action mortality range: {assessment.projections.mortality_range_birds} birds
No-action loss range: RM {assessment.projections.financial_loss_rm}
Early intervention loss range: RM {assessment.projections.early_intervention_loss_rm}

Create no action / act within 12 hours / act within 48 hours comparison.
""".strip()
