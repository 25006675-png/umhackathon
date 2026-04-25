from __future__ import annotations

from typing import Any

from api.schemas import RiskAssessment


SYSTEM_PROMPT = (
    "You are TernakAI's poultry decision engine. "
    "Reply in the exact structured text format requested. "
    "No markdown, no code fences, no extra commentary."
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
    traj_dir = trajectory.get("direction", "stable") if trajectory else "stable"
    traj_days = trajectory.get("consecutive_worsening_days", 0) if trajectory else 0
    return f"""Reply EXACTLY in this format, no other text:

INTERPRETATION: <max 35 words, plain language, mention trajectory if worsening>
HYPOTHESIS_1: <disease> | <0.0-1.0> | <25 words: which signals match> | <source> | <section>
HYPOTHESIS_2: <disease> | <0.0-1.0> | <25 words: which signals match> | <source> | <section>
HYPOTHESIS_3: <disease> | <0.0-1.0> | <25 words: which signals match> | <source> | <section>
INSIGHT: <max 20 words, urgency based on trend>

Diseases: {diseases}
Citations: {" | ".join(f"{c['disease']}={c['source']},{c['section']},p{c.get('page','?')}" for c in context_chunks)}
Data: risk={assessment.risk.score} {assessment.risk.level}, trend={assessment.risk.trend}, feed={assessment.deviations.feed_intake:.0%}, temp={assessment.deviations.temperature:.0%}, mortality={assessment.signals.mortality_count}vs{assessment.baselines.mortality_count}, notes={notes}, traj={traj_dir}/{traj_days}d""".strip()


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
