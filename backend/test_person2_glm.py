from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv

load_dotenv("../.env")

from api.schemas import (
    FarmBaselines,
    FarmDeviations,
    FarmSignals,
    ProjectionSummary,
    RiskAssessment,
    RiskSummary,
)
from glm.orchestrator import GLMOrchestrator


def make_assessment(
    *,
    flock_id: str,
    temperature_celsius: float,
    feed_intake_kg: float,
    mortality_count: int,
    farmer_notes: str,
    baseline_temperature: float,
    baseline_feed: float,
    baseline_mortality: float,
    risk_score: int,
    risk_level: str,
    trend: str,
    previous_scores: list[int],
    flock_size: int = 5000,
    age_days: int = 28,
) -> RiskAssessment:
    temp_deviation = (temperature_celsius - baseline_temperature) / baseline_temperature
    feed_deviation = (feed_intake_kg - baseline_feed) / baseline_feed
    mortality_deviation = (
        (mortality_count - baseline_mortality) / baseline_mortality
        if baseline_mortality
        else float(mortality_count)
    )
    mortality_low = int(flock_size * 0.02)
    mortality_high = int(flock_size * 0.05)
    if risk_score >= 70:
        mortality_low = int(flock_size * 0.30)
        mortality_high = int(flock_size * 0.50)
    elif risk_score >= 45:
        mortality_low = int(flock_size * 0.08)
        mortality_high = int(flock_size * 0.18)

    loss_low = mortality_low * 7
    loss_high = mortality_high * 7

    return RiskAssessment(
        farm_id="farm_test",
        flock_id=flock_id,
        flock_age_days=age_days,
        flock_size=flock_size,
        timestamp=datetime(2026, 4, 24, 8, 0, tzinfo=timezone.utc),
        signals=FarmSignals(
            temperature_celsius=temperature_celsius,
            feed_intake_kg=feed_intake_kg,
            mortality_count=mortality_count,
            farmer_notes=farmer_notes,
        ),
        baselines=FarmBaselines(
            temperature_celsius=baseline_temperature,
            feed_intake_kg=baseline_feed,
            mortality_count=baseline_mortality,
        ),
        deviations=FarmDeviations(
            temperature=temp_deviation,
            feed_intake=feed_deviation,
            mortality=mortality_deviation,
        ),
        risk=RiskSummary(
            score=risk_score,
            level=risk_level,
            trend=trend,
            previous_scores=previous_scores,
        ),
        projections=ProjectionSummary(
            mortality_range_percent=(mortality_low / flock_size * 100, mortality_high / flock_size * 100),
            mortality_range_birds=(mortality_low, mortality_high),
            financial_loss_rm=(loss_low, loss_high),
            early_intervention_loss_rm=(loss_low * 0.2, loss_high * 0.2),
            time_horizon_days=5,
        ),
    )


SCENARIOS: list[dict[str, Any]] = [
    {
        "name": "normal_baseline_low_risk",
        "assessment": make_assessment(
            flock_id="test_low_001",
            temperature_celsius=30.4,
            feed_intake_kg=51.0,
            mortality_count=1,
            farmer_notes="ayam nampak aktif, makan normal",
            baseline_temperature=30.2,
            baseline_feed=51.3,
            baseline_mortality=1.0,
            risk_score=18,
            risk_level="Low",
            trend="stable",
            previous_scores=[16, 17, 18],
        ),
        "expected_top": "Chronic Respiratory Disease (CRD)",
        "required_words": ["feed", "temperature", "mortality"],
    },
    {
        "name": "early_warning_feed_drop",
        "assessment": make_assessment(
            flock_id="test_moderate_001",
            temperature_celsius=31.4,
            feed_intake_kg=45.8,
            mortality_count=2,
            farmer_notes="kurang makan tapi belum nampak sakit teruk",
            baseline_temperature=30.2,
            baseline_feed=51.3,
            baseline_mortality=1.0,
            risk_score=48,
            risk_level="Moderate",
            trend="rising",
            previous_scores=[22, 31, 48],
        ),
        "expected_top": "Chronic Respiratory Disease (CRD)",
        "required_words": ["feed", "rising", "12 hours"],
    },
    {
        "name": "high_risk_crd_like_outbreak",
        "assessment": make_assessment(
            flock_id="test_high_crd_001",
            temperature_celsius=33.5,
            feed_intake_kg=42.0,
            mortality_count=3,
            farmer_notes="ayam senyap sikit, kurang makan, ada bunyi nafas",
            baseline_temperature=30.2,
            baseline_feed=51.3,
            baseline_mortality=1.0,
            risk_score=72,
            risk_level="High",
            trend="rising",
            previous_scores=[35, 42, 58, 72],
        ),
        "expected_top": "Chronic Respiratory Disease (CRD)",
        "required_words": ["High risk", "disease", "Perlu tindakan"],
    },
    {
        "name": "heat_stress_heavy_case",
        "assessment": make_assessment(
            flock_id="test_heat_001",
            temperature_celsius=36.0,
            feed_intake_kg=43.5,
            mortality_count=2,
            farmer_notes="cuaca sangat panas, ayam panting dan minum banyak",
            baseline_temperature=30.5,
            baseline_feed=51.0,
            baseline_mortality=1.0,
            risk_score=69,
            risk_level="High",
            trend="rising",
            previous_scores=[28, 40, 55, 69],
        ),
        "expected_top": "Heat Stress",
        "required_words": ["ventilation", "temperature", "heat"],
    },
]


async def run_scenario(orchestrator: GLMOrchestrator, scenario: dict[str, Any]) -> None:
    name = scenario["name"]
    print()
    print("=" * 70)
    print(f"SCENARIO: {name}")
    print("=" * 70)
    try:
        result = await orchestrator.analyse(
            assessment=scenario["assessment"],
            farmer_constraints={"budget": "low", "vet_available": False},
            language="bilingual",
            use_live_glm=True,
        )
    except Exception as exc:
        print(f"FAILED: {type(exc).__name__}: {exc}")
        return

    print(f"generated_by      : {result.generated_by}")
    print(f"interpretation    : {result.interpretation}")
    print(f"insight           : {result.insight}")
    print("hypotheses        :")
    for h in result.hypotheses:
        print(f"  - {h.disease}  (confidence={h.confidence:.2f})")
        print(f"    reasoning: {h.reasoning}")
    print("recommendations   :")
    for r in result.recommendations:
        print(f"  {r.priority}. {r.action}")
        print(f"     timeframe: {r.timeframe}")
        print(f"     reason: {r.reason}")
        print(f"     impact: {r.expected_impact}")
    print("constraint_adjusted_plan:")
    for r in result.constraint_adjusted_plan:
        print(f"  {r.priority}. {r.action}  ({r.timeframe})")
    print("narration:")
    print(f"  no_action     : {result.narration.no_action}")
    print(f"  act_12_hours  : {result.narration.act_within_12_hours}")
    print(f"  act_48_hours  : {result.narration.act_within_48_hours}")


async def main() -> None:
    orchestrator = GLMOrchestrator()
    for scenario in SCENARIOS:
        await run_scenario(orchestrator, scenario)


if __name__ == "__main__":
    asyncio.run(main())
