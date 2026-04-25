from __future__ import annotations

from typing import Any

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
    trajectory: dict[str, Any] | None = None,
) -> str:
    notes = assessment.signals.farmer_notes or "none"
    diseases = ", ".join(chunk["disease"] for chunk in context_chunks)
    citations = "\n".join(
        f"- {chunk['disease']}: {chunk['source']} | {chunk['section']} | page {chunk.get('page') or 'n/a'}"
        for chunk in context_chunks
    )
    trajectory_block = _format_trajectory_block(trajectory)
    return f"""
Reply in this EXACT format. No extra text, no headers, no markdown.

INTERPRETATION: <one paragraph in {language}, max 40 words, plain language for farmer. MUST reference the trajectory below when it is rising or worsening for multiple days.>
HYPOTHESIS_1: <disease name> | <confidence 0.0-1.0> | <reasoning 40-60 words: explain which signals match this disease and what would raise or lower confidence> | <source> | <section>
HYPOTHESIS_2: <disease name> | <confidence 0.0-1.0> | <reasoning 40-60 words: explain which signals match this disease and what would raise or lower confidence> | <source> | <section>
HYPOTHESIS_3: <disease name> | <confidence 0.0-1.0> | <reasoning 40-60 words: explain which signals match this disease and what would raise or lower confidence> | <source> | <section>
HYPOTHESIS_4: <disease name> | <confidence 0.0-1.0> | <reasoning 40-60 words: explain which signals match this disease and what would raise or lower confidence> | <source> | <section>
INSIGHT: <one forward-looking sentence, max 30 words. Use the trajectory direction to justify urgency.>

Pick diseases ONLY from: {diseases}.
Use only these citations:
{citations}

Farm context (today):
risk={assessment.risk.score}/100 ({assessment.risk.level}), trend={assessment.risk.trend}
temperature deviation={assessment.deviations.temperature:.1%}
feed deviation={assessment.deviations.feed_intake:.1%}
mortality count={assessment.signals.mortality_count} vs baseline {assessment.baselines.mortality_count}
farmer notes: {notes}

Multi-day trajectory (last {len(trajectory["days"]) if trajectory and trajectory.get("days") else 0} days, oldest first):
{trajectory_block}
""".strip()


def _format_trajectory_block(trajectory: dict[str, Any] | None) -> str:
    if not trajectory or not trajectory.get("days"):
        return "direction=stable, consecutive_worsening_days=0\n(no multi-day history available)"
    lines = [
        f"direction={trajectory.get('direction', 'stable')}, "
        f"consecutive_worsening_days={trajectory.get('consecutive_worsening_days', 0)}"
    ]
    for day in trajectory["days"]:
        lines.append(
            f"- {day['reading_date']}: risk={day['score']} ({day['level']}), "
            f"feed={day['feed_pct_vs_baseline']}% vs baseline, "
            f"temp {day['temp_delta_c']:+.1f}°C, "
            f"mortality={day['mortality']}, "
            f"top_driver={day['top_driver']}"
        )
    return "\n".join(lines)
