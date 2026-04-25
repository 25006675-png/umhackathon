"""Smoke-test: live GLM API → parse → frontend shape. No RAG/chromadb."""
from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

# Patch out RAG before any import touches chromadb
import unittest.mock as mock
sys.modules.setdefault("chromadb", mock.MagicMock())

from api.schemas import (
    FarmBaselines, FarmDeviations, FarmSignals,
    GLMAnalysis, ProjectionSummary, RiskAssessment, RiskSummary,
)
from glm.client import GLMClient, GLMClientError
from glm.prompts.interpretation import SYSTEM_PROMPT as REASONING_SYSTEM, build_reasoning_call_prompt
from glm.prompts.recommendation import SYSTEM_PROMPT as ACTION_SYSTEM_PROMPT, build_action_call_prompt


MOCK_ASSESSMENT = RiskAssessment(
    farm_id="farm_001",
    flock_id="flock_2026_batch3",
    flock_age_days=28,
    flock_size=5000,
    reading_date=datetime(2026, 4, 24).date(),
    timestamp=datetime(2026, 4, 24, 8, 0, tzinfo=timezone.utc),
    signals=FarmSignals(
        temperature_celsius=33.5,
        feed_intake_kg=42.0,
        mortality_count=3,
        farmer_notes="ayam senyap sikit, kurang makan",
    ),
    baselines=FarmBaselines(
        temperature_celsius=30.2,
        feed_intake_kg=51.3,
        mortality_count=1.0,
    ),
    deviations=FarmDeviations(
        temperature=0.109,
        feed_intake=-0.181,
        mortality=2.0,
    ),
    risk=RiskSummary(score=72, level="High", trend="rising", previous_scores=[35, 42, 58, 72]),
    projections=ProjectionSummary(
        mortality_range_percent=(30, 50),
        mortality_range_birds=(1500, 2500),
        financial_loss_rm=(10500, 17500),
        early_intervention_loss_rm=(1750, 3500),
        time_horizon_days=5,
    ),
)

MOCK_CHUNKS = [
    {"disease": "Chronic Respiratory Disease (CRD)", "source": "Knowledge Base", "section": "CRD", "page": 1},
    {"disease": "Heat Stress",                        "source": "Knowledge Base", "section": "Heat Stress", "page": 2},
    {"disease": "Newcastle Disease (ND)",              "source": "Knowledge Base", "section": "Newcastle Disease", "page": 3},
]


def _parse_sections(text: str) -> dict[str, str]:
    import re
    SECTION_RE = re.compile(
        r"^(INTERPRETATION|INSIGHT|HYPOTHESIS_[1234]|ACTION_[1234]|NO_ACTION|ACT_12H|ACT_48H)\s*:\s*(.*)$"
    )
    sections: dict[str, str] = {}
    current = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        m = SECTION_RE.match(line)
        if m:
            current = m.group(1)
            sections[current] = m.group(2).strip()
        elif current:
            sections[current] = (sections[current] + " " + line).strip()
    return sections


async def step1_ping() -> bool:
    print("\n[1] API key loaded + ping...")
    client = GLMClient()
    if not client.is_configured:
        print("  FAIL: z_ai_api_key is None — .env not loaded")
        return False
    print(f"  key prefix: {client.api_key[:12]}...")
    print(f"  endpoint  : {client.endpoint}")
    print(f"  model     : {client.model}")
    try:
        reply = await client.ping()
        print(f"  OK: {reply!r}")
        return True
    except Exception as exc:
        print(f"  FAIL: {type(exc).__name__}: {exc}")
        return False


async def step2_reasoning() -> tuple[bool, str]:
    print("\n[2] Reasoning call (INTERPRETATION + HYPOTHESIS_*)...")
    client = GLMClient()
    prompt = build_reasoning_call_prompt(MOCK_ASSESSMENT, MOCK_CHUNKS, "en", trajectory=None)
    print(f"  prompt size: {len(prompt)} chars")
    try:
        raw = await client.complete(REASONING_SYSTEM, prompt, max_tokens=800, stream=True)
        print(f"  response size: {len(raw)} chars")
        sections = _parse_sections(raw)
        print(f"  parsed keys : {list(sections.keys())}")
        interp = sections.get("INTERPRETATION", "")
        h1 = sections.get("HYPOTHESIS_1", "")
        print(f"  INTERPRETATION: {interp[:120]}")
        print(f"  HYPOTHESIS_1  : {h1[:120]}")
        ok = bool(interp and h1)
        print(f"  {'OK' if ok else 'WARN: missing required sections'}")
        return ok, raw
    except Exception as exc:
        print(f"  FAIL: {type(exc).__name__}: {exc}")
        return False, ""


async def step3_actions() -> bool:
    print("\n[3] Action call (ACTION_* + narration)...")
    from api.schemas import DiseaseHypothesis, Citation
    client = GLMClient()
    hypotheses = [
        DiseaseHypothesis(
            disease="Chronic Respiratory Disease (CRD)",
            confidence=0.74,
            reasoning="Feed drop + quiet birds pattern.",
            matching_signals=["feed drop", "quiet birds"],
            citations=[Citation(source="Knowledge Base", section="CRD", page=1, relevance_score=0.72)],
        )
    ]
    prompt = build_action_call_prompt(MOCK_ASSESSMENT, hypotheses, {})
    print(f"  prompt size: {len(prompt)} chars")
    try:
        raw = await client.complete(ACTION_SYSTEM_PROMPT, prompt, max_tokens=600, stream=True)
        print(f"  response size: {len(raw)} chars")
        sections = _parse_sections(raw)
        print(f"  parsed keys : {list(sections.keys())}")
        a1 = sections.get("ACTION_1", "")
        no_action = sections.get("NO_ACTION", "")
        print(f"  ACTION_1  : {a1[:120]}")
        print(f"  NO_ACTION : {no_action[:120]}")
        ok = bool(a1)
        print(f"  {'OK' if ok else 'WARN: no ACTION_1 found'}")
        return ok
    except Exception as exc:
        print(f"  FAIL: {type(exc).__name__}: {exc}")
        return False


async def step4_frontend_shape() -> bool:
    print("\n[4] Full orchestrator → frontend shape (no RAG)...")
    from glm.orchestrator import GLMOrchestrator

    # Patch _build_context_chunks to return mock data (skip chromadb)
    orchestrator = GLMOrchestrator()
    orchestrator._build_context_chunks = lambda _: MOCK_CHUNKS  # type: ignore[method-assign]

    try:
        result = await orchestrator.analyse(
            assessment=MOCK_ASSESSMENT,
            use_live_glm=True,
            language="en",
        )
        print(f"  generated_by   : {result.generated_by}")
        print(f"  interpretation : {result.interpretation[:120]}")
        print(f"  hypotheses     : {[h.disease for h in result.hypotheses]}")
        print(f"  recommendations: {[r.action[:60] for r in result.recommendations]}")
        print(f"  narration      : {result.narration.no_action[:80]}")

        # Simulate _to_frontend
        narration_parts = [
            f"Without action: {result.narration.no_action}",
            f"Act within 12h: {result.narration.act_within_12_hours}",
            f"Act within 48h: {result.narration.act_within_48_hours}",
        ]
        frontend = {
            "interpretation": result.interpretation,
            "hypothesis": [{"disease": h.disease, "confidence": h.confidence} for h in result.hypotheses],
            "recommendations": [a.action for a in result.recommendations],
            "narration": "\n\n".join(narration_parts),
            "generated_by": result.generated_by,
        }
        print(f"\n  --- FRONTEND PAYLOAD ---")
        for k, v in frontend.items():
            val = str(v)
            print(f"  {k}: {val[:100]}")

        live = result.generated_by != "offline-glm-fallback"
        print(f"\n  {'LIVE GLM used' if live else 'WARNING: fell back to offline'}")
        return live
    except Exception as exc:
        import traceback
        print(f"  FAIL: {type(exc).__name__}: {exc}")
        traceback.print_exc()
        return False


async def main() -> None:
    steps = [
        ("ping",       step1_ping),
        ("reasoning",  step2_reasoning),
        ("actions",    step3_actions),
        ("frontend",   step4_frontend_shape),
    ]
    results = []
    for name, fn in steps:
        result = await fn()
        # step2 returns a tuple
        passed = result[0] if isinstance(result, tuple) else result
        results.append((name, passed))
        if not passed and name == "ping":
            print("\nAborting: cannot reach API.")
            break

    print(f"\n{'='*50}")
    for name, passed in results:
        print(f"  {'PASS' if passed else 'FAIL'}  {name}")
    print(f"{'='*50}")
    sys.exit(0 if all(p for _, p in results) else 1)


if __name__ == "__main__":
    asyncio.run(main())
