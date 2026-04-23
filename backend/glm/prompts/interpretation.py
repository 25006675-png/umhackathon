from __future__ import annotations

from api.schemas import RiskAssessment


SYSTEM_PROMPT = (
    "You are TernakAI's poultry decision engine. "
    "Return valid JSON only. No markdown, no code fences, no hidden reasoning."
)


def build_interpretation_prompt(assessment: RiskAssessment, language: str) -> str:
    notes = assessment.signals.farmer_notes or "No farmer notes provided."
    return f"""
Task: write a plain-language farm interpretation in {language}.
Return JSON with this exact shape:
{{
  "interpretation": "string",
  "insight": "string"
}}

Farm context:
- Flock age: {assessment.flock_age_days} days
- Flock size: {assessment.flock_size}
- Risk: {assessment.risk.score}/100 ({assessment.risk.level}), trend {assessment.risk.trend}
- Temperature: {assessment.signals.temperature_celsius}C vs baseline {assessment.baselines.temperature_celsius}C
- Feed intake: {assessment.signals.feed_intake_kg}kg vs baseline {assessment.baselines.feed_intake_kg}kg
- Mortality: {assessment.signals.mortality_count} vs baseline {assessment.baselines.mortality_count}
- Farmer notes: {notes}

Rules:
- Interpretation must explain what the combined signals mean.
- Insight must be forward-looking and mention urgency window if relevant.
- Keep each field under 80 words.
""".strip()


def build_reasoning_call_prompt(
    assessment: RiskAssessment,
    context_chunks: list[dict],
    language: str,
) -> str:
    notes = assessment.signals.farmer_notes or "none"
    diseases = ", ".join(chunk["disease"] for chunk in context_chunks)
    return f"""
Reply in this EXACT format. No extra text, no headers, no markdown.

INTERPRETATION: <one paragraph in {language}, max 40 words, plain language for farmer>
HYPOTHESIS_1: <disease name> | <confidence 0.0-1.0> | <reasoning max 20 words>
HYPOTHESIS_2: <disease name> | <confidence 0.0-1.0> | <reasoning max 20 words>
HYPOTHESIS_3: <disease name> | <confidence 0.0-1.0> | <reasoning max 20 words>
INSIGHT: <one forward-looking sentence, max 30 words>

Pick diseases ONLY from: {diseases}.

Farm context:
risk={assessment.risk.score}/100 ({assessment.risk.level}), trend={assessment.risk.trend}, previous={assessment.risk.previous_scores}
temperature deviation={assessment.deviations.temperature:.1%}
feed deviation={assessment.deviations.feed_intake:.1%}
mortality count={assessment.signals.mortality_count} vs baseline {assessment.baselines.mortality_count}
farmer notes: {notes}
""".strip()
