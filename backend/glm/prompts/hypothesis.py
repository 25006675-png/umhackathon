from __future__ import annotations

from api.schemas import RiskAssessment


SYSTEM_PROMPT = (
    "Rank poultry disease hypotheses from farm signals and retrieved veterinary context. "
    "Return cautious, evidence-grounded reasoning and cite sources."
)


FALLBACK_PROFILES = [
    {
        "disease": "Chronic Respiratory Disease (CRD)",
        "signals": ["feed drop", "quiet birds", "respiratory stress", "rising mortality"],
        "source": "Fallback Poultry Disease Profile",
        "section": "CRD",
        "page": 1,
    },
    {
        "disease": "Heat Stress",
        "signals": ["high shed temperature", "feed drop", "panting", "sudden mortality"],
        "source": "Fallback Poultry Disease Profile",
        "section": "Heat Stress",
        "page": 2,
    },
    {
        "disease": "Newcastle Disease",
        "signals": ["mortality spike", "respiratory signs", "neurological signs", "feed drop"],
        "source": "Fallback Poultry Disease Profile",
        "section": "Newcastle Disease",
        "page": 3,
    },
]


def build_hypothesis_prompt(assessment: RiskAssessment, context_chunks: list[dict]) -> str:
    context = context_chunks or FALLBACK_PROFILES
    return f"""
Risk level: {assessment.risk.level} ({assessment.risk.score}/100)
Signal pattern:
- Temperature deviation: {assessment.deviations.temperature:.1%}
- Feed intake deviation: {assessment.deviations.feed_intake:.1%}
- Mortality deviation: {assessment.deviations.mortality}
- Notes: {assessment.signals.farmer_notes or "none"}

Veterinary context:
{context}

Rank the top likely conditions, confidence, matching signals, and citations.
""".strip()
