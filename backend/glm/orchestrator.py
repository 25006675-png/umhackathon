from __future__ import annotations

import re
import sys
from datetime import datetime, timezone
from typing import Any

import httpx

from api.schemas import (
    Citation,
    DiseaseHypothesis,
    FarmBaselines,
    FarmDeviations,
    FarmSignals,
    GLMAnalysis,
    ProjectionSummary,
    RecommendedAction,
    RiskAssessment,
    RiskSummary,
    ScenarioNarrative,
)
from glm.client import GLMClient, GLMClientError
from glm.prompts.constraints import build_constraints_prompt
from glm.prompts.hypothesis import FALLBACK_PROFILES, build_hypothesis_prompt
from glm.prompts.insight import build_insight_prompt
from glm.prompts.interpretation import SYSTEM_PROMPT as REASONING_SYSTEM_PROMPT
from glm.prompts.interpretation import build_reasoning_call_prompt
from glm.prompts.narration import build_narration_prompt
from glm.prompts.recommendation import SYSTEM_PROMPT as ACTION_SYSTEM_PROMPT
from glm.prompts.recommendation import build_action_call_prompt, build_recommendation_prompt


def build_demo_assessment(flock_id: str = "flock_2026_batch3") -> RiskAssessment:
    return RiskAssessment(
        farm_id="farm_001",
        flock_id=flock_id,
        flock_age_days=28,
        flock_size=5000,
        timestamp=datetime(2026, 4, 23, 8, 0, tzinfo=timezone.utc),
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
        risk=RiskSummary(
            score=72,
            level="High",
            trend="rising",
            previous_scores=[35, 42, 58, 72],
        ),
        projections=ProjectionSummary(
            mortality_range_percent=(30, 50),
            mortality_range_birds=(1500, 2500),
            financial_loss_rm=(10500, 17500),
            early_intervention_loss_rm=(1750, 3500),
            time_horizon_days=5,
        ),
    )


class GLMOrchestrator:
    def __init__(self, client: GLMClient | None = None) -> None:
        self.client = client or GLMClient()

    async def analyse(
        self,
        assessment: RiskAssessment,
        farmer_constraints: dict[str, Any] | None = None,
        language: str = "bilingual",
        use_live_glm: bool = False,
    ) -> GLMAnalysis:
        farmer_constraints = farmer_constraints or {}
        context_chunks = self._build_context_chunks(assessment)
        prompt_trace = {
            "reasoning_call": build_reasoning_call_prompt(assessment, context_chunks, language),
            "action_call": "",
        }

        if use_live_glm and self.client.is_configured:
            live_result = await self._run_live_analysis(
                assessment,
                context_chunks,
                farmer_constraints,
                language,
                prompt_trace,
            )
            if live_result is not None:
                return live_result

        fallback = self._build_fallback_analysis(
            assessment=assessment,
            farmer_constraints=farmer_constraints,
            prompt_trace=prompt_trace,
        )
        return fallback

    async def chat(
        self,
        question: str,
        assessment: RiskAssessment,
        language: str = "bilingual",
    ) -> str:
        lowered = question.lower()
        if "why" in lowered or "kenapa" in lowered:
            return (
                "Risk is high because feed intake dropped sharply while shed temperature and mortality rose together. "
                "Corak ini bermaksud ayam sedang menghadapi tekanan kesihatan, bukan perubahan biasa sahaja."
            )
        if "first" in lowered or "dulu" in lowered:
            return (
                "Act first on ventilation, isolation/observation of weak birds, and calling a vet with the readings. "
                "These actions reduce near-term risk while keeping diagnosis options open."
            )
        return (
            f"For flock {assessment.flock_id}, current risk is {assessment.risk.level} "
            f"({assessment.risk.score}/100). Focus on the priority action list and monitor again within 12 hours."
        )

    async def _run_live_analysis(
        self,
        assessment: RiskAssessment,
        context_chunks: list[dict[str, Any]],
        farmer_constraints: dict[str, Any],
        language: str,
        prompt_trace: dict[str, str],
    ) -> GLMAnalysis | None:
        try:
            reasoning_text = await self.client.complete(
                REASONING_SYSTEM_PROMPT,
                prompt_trace["reasoning_call"],
                max_tokens=900,
            )
            sections = _parse_sections(reasoning_text)
            interpretation = sections.get("INTERPRETATION", "")
            insight = sections.get("INSIGHT", "")
            hypotheses = self._parse_hypotheses(sections, context_chunks)
            if not hypotheses or not interpretation:
                raise GLMClientError(
                    f"Reasoning call missing required sections. Got keys: {list(sections.keys())}"
                )

            prompt_trace["action_call"] = build_action_call_prompt(
                assessment,
                hypotheses,
                farmer_constraints,
            )
            action_text = await self.client.complete(
                ACTION_SYSTEM_PROMPT,
                prompt_trace["action_call"],
                max_tokens=900,
            )
            action_sections = _parse_sections(action_text)
            recommendations = self._parse_actions(action_sections)
            if not recommendations:
                raise GLMClientError(
                    f"Action call missing recommendations. Got keys: {list(action_sections.keys())}"
                )
            narration = ScenarioNarrative(
                no_action=action_sections.get("NO_ACTION") or self._build_narration(assessment).no_action,
                act_within_12_hours=action_sections.get("ACT_12H") or self._build_narration(assessment).act_within_12_hours,
                act_within_48_hours=action_sections.get("ACT_48H") or self._build_narration(assessment).act_within_48_hours,
            )
            adjusted_plan = self._apply_constraints(recommendations, farmer_constraints)

            return GLMAnalysis(
                flock_id=assessment.flock_id,
                generated_by="z-ai-glm",
                interpretation=interpretation or self._fallback_interpretation(assessment),
                hypotheses=hypotheses,
                insight=insight or self._build_insight(assessment, hypotheses),
                recommendations=recommendations,
                constraint_adjusted_plan=adjusted_plan,
                narration=narration,
                raw_prompt_trace=prompt_trace,
            )
        except (GLMClientError, httpx.HTTPError, ValueError, TypeError) as exc:
            print(f"[glm] live analysis failed, using fallback: {type(exc).__name__}: {exc}", file=sys.stderr)
            return None

    def _parse_hypotheses(
        self,
        sections: dict[str, str],
        context_chunks: list[dict[str, Any]],
    ) -> list[DiseaseHypothesis]:
        allowed = {chunk["disease"] for chunk in context_chunks}
        results: list[DiseaseHypothesis] = []
        for key in ("HYPOTHESIS_1", "HYPOTHESIS_2", "HYPOTHESIS_3"):
            line = sections.get(key, "").strip()
            if not line:
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 2:
                continue
            disease = self._match_disease(parts[0], allowed)
            if not disease:
                continue
            try:
                confidence = max(0.0, min(1.0, float(re.findall(r"[0-9]*\.?[0-9]+", parts[1])[0])))
            except (IndexError, ValueError):
                confidence = 0.5
            reasoning = parts[2] if len(parts) > 2 else "Pattern match from retrieved disease context."
            results.append(
                DiseaseHypothesis(
                    disease=disease,
                    confidence=confidence,
                    reasoning=reasoning,
                    matching_signals=[],
                    citations=[self._citation_for(_section_for_disease(disease))],
                )
            )
        return results

    def _match_disease(self, raw: str, allowed: set[str]) -> str | None:
        cleaned = raw.strip().lower()
        for option in allowed:
            if option.lower() in cleaned or cleaned in option.lower():
                return option
        return None

    def _parse_actions(self, sections: dict[str, str]) -> list[RecommendedAction]:
        actions: list[RecommendedAction] = []
        for index, key in enumerate(("ACTION_1", "ACTION_2", "ACTION_3", "ACTION_4")):
            line = sections.get(key, "").strip()
            if not line:
                continue
            parts = [p.strip() for p in line.split("|")]
            if not parts or not parts[0]:
                continue
            actions.append(
                RecommendedAction(
                    priority=index + 1,
                    action=parts[0],
                    timeframe=parts[1] if len(parts) > 1 and parts[1] else "Within 12 hours",
                    reason=parts[2] if len(parts) > 2 and parts[2] else "Recommended from current farm risk pattern.",
                    expected_impact=parts[3] if len(parts) > 3 and parts[3] else "Reduces near-term outbreak risk.",
                )
            )
        return actions

    def _build_fallback_analysis(
        self,
        *,
        assessment: RiskAssessment,
        farmer_constraints: dict[str, Any],
        prompt_trace: dict[str, str],
    ) -> GLMAnalysis:
        hypotheses = self._rank_hypotheses(assessment)
        recommendations = self._build_recommendations(assessment, hypotheses)
        prompt_trace["action_call"] = build_action_call_prompt(
            assessment,
            hypotheses,
            farmer_constraints,
        )
        return GLMAnalysis(
            flock_id=assessment.flock_id,
            generated_by="offline-glm-fallback",
            interpretation=self._fallback_interpretation(assessment),
            hypotheses=hypotheses,
            insight=self._build_insight(assessment, hypotheses),
            recommendations=recommendations,
            constraint_adjusted_plan=self._apply_constraints(recommendations, farmer_constraints),
            narration=self._build_narration(assessment),
            raw_prompt_trace=prompt_trace,
        )

    def _build_context_chunks(self, assessment: RiskAssessment) -> list[dict[str, Any]]:
        notes = assessment.signals.farmer_notes.lower()
        has_heat = any(term in notes for term in ["panas", "panting", "heat"])
        has_quiet = any(term in notes for term in ["senyap", "quiet", "kurang makan"])
        ranked = list(FALLBACK_PROFILES)
        if has_heat:
            ranked.sort(key=lambda item: 0 if item["disease"] == "Heat Stress" else 1)
        elif has_quiet:
            ranked.sort(key=lambda item: 0 if item["disease"] == "Chronic Respiratory Disease (CRD)" else 1)
        return ranked[:3]

    def _fallback_interpretation(self, assessment: RiskAssessment) -> str:
        feed_drop = abs(assessment.deviations.feed_intake)
        temp_rise = assessment.deviations.temperature
        notes = assessment.signals.farmer_notes.lower()
        note_signal = " Farmer notes also mention quiet birds and reduced appetite." if notes else ""
        return (
            f"{assessment.risk.level} risk pattern detected with a {assessment.risk.trend} trend: "
            f"feed intake is down {feed_drop:.1%}, shed temperature is up "
            f"{temp_rise:.1%}, and mortality is compared against baseline.{note_signal} "
            "Together, these signals suggest the flock is moving from environmental stress into possible disease pressure. "
            "Perlu tindakan awal sekarang, bukan tunggu esok."
        )

    def _rank_hypotheses(self, assessment: RiskAssessment) -> list[DiseaseHypothesis]:
        notes = assessment.signals.farmer_notes.lower()
        has_quiet_or_feed_notes = any(term in notes for term in ["senyap", "kurang makan", "quiet", "less feed"])
        has_heat_notes = any(term in notes for term in ["panas", "panting", "heat"])
        feed_drop = assessment.deviations.feed_intake <= -0.12
        temp_high = assessment.deviations.temperature >= 0.08 or assessment.signals.temperature_celsius >= 32
        mortality_up = assessment.deviations.mortality >= 1.5

        hypotheses = [
            DiseaseHypothesis(
                disease="Chronic Respiratory Disease (CRD)",
                confidence=0.74 if has_quiet_or_feed_notes and feed_drop else 0.58,
                reasoning=(
                    "Feed reduction, quiet birds, and rising mortality fit an early respiratory disease pattern. "
                    "CRD remains a working hypothesis until respiratory signs and veterinary checks confirm it."
                ),
                matching_signals=["feed drop", "quiet birds", "rising mortality"],
                citations=[self._citation_for("CRD")],
            ),
            DiseaseHypothesis(
                disease="Heat Stress",
                confidence=0.72 if has_heat_notes and temp_high else (0.62 if temp_high and feed_drop else 0.4),
                reasoning=(
                    "The shed is warmer than baseline and feed intake is lower, which can indicate heat stress. "
                    "It may also be amplifying another disease process."
                ),
                matching_signals=["temperature rise", "feed drop"],
                citations=[self._citation_for("Heat Stress")],
            ),
            DiseaseHypothesis(
                disease="Newcastle Disease",
                confidence=0.35 if mortality_up else 0.2,
                reasoning=(
                    "Mortality is above baseline, so Newcastle Disease should stay on the watchlist. "
                    "Confidence is lower without neurological signs or a sharper mortality spike."
                ),
                matching_signals=["mortality increase", "feed drop"],
                citations=[self._citation_for("Newcastle Disease")],
            ),
        ]
        return sorted(hypotheses, key=lambda item: item.confidence, reverse=True)

    def _build_insight(
        self,
        assessment: RiskAssessment,
        hypotheses: list[DiseaseHypothesis],
    ) -> str:
        top = hypotheses[0].disease
        return (
            f"The key pattern is convergence: feed, temperature, mortality, and farmer notes are all worsening together. "
            f"If the trend continues, {top} or a heat-amplified respiratory problem could become visible within 24-48 hours."
        )

    def _build_recommendations(
        self,
        assessment: RiskAssessment,
        hypotheses: list[DiseaseHypothesis],
    ) -> list[RecommendedAction]:
        top = hypotheses[0].disease if hypotheses else "suspected disease pressure"
        return [
            RecommendedAction(
                priority=1,
                action="Improve ventilation and reduce shed heat load immediately.",
                timeframe="Now to 2 hours",
                reason="Temperature is above baseline and can worsen feed drop, respiratory stress, and mortality.",
                expected_impact="Fastest low-cost way to reduce stress while diagnosis is confirmed.",
            ),
            RecommendedAction(
                priority=2,
                action="Separate visibly weak birds and inspect for coughing, nasal discharge, wet litter, and panting.",
                timeframe="Within 6 hours",
                reason=f"Top working hypothesis is {top}; symptom inspection helps separate respiratory disease from heat stress.",
                expected_impact="Improves evidence quality and reduces spread risk if infection is present.",
            ),
            RecommendedAction(
                priority=3,
                action="Contact a poultry vet or local animal health officer with the risk score, readings, and notes.",
                timeframe="Within 12 hours",
                reason="Mortality is already above baseline; treatment should not be chosen blindly.",
                expected_impact="Enables targeted treatment, sampling, or movement control before losses accelerate.",
            ),
            RecommendedAction(
                priority=4,
                action="Recheck feed intake, mortality, and shed temperature at the next 12-hour interval.",
                timeframe="12 hours",
                reason="The trend is rising, so the next reading determines whether escalation is working.",
                expected_impact="Creates a clear go/no-go trigger for stronger intervention.",
            ),
        ]

    def _apply_constraints(
        self,
        recommendations: list[RecommendedAction],
        constraints: dict[str, Any],
    ) -> list[RecommendedAction]:
        if not constraints:
            return recommendations

        adjusted = list(recommendations)
        if constraints.get("budget") in {"low", "very_low"} or constraints.get("vet_available") is False:
            adjusted.sort(key=lambda action: 0 if "ventilation" in action.action.lower() else action.priority)
            adjusted[0] = _copy_model(
                adjusted[0],
                reason=adjusted[0].reason
                + " This stays first because it is low-cost and does not require external supplies.",
            )
        return [_copy_model(action, priority=index + 1) for index, action in enumerate(adjusted)]

    def _build_narration(self, assessment: RiskAssessment) -> ScenarioNarrative:
        birds = assessment.projections.mortality_range_birds
        loss = assessment.projections.financial_loss_rm
        early = assessment.projections.early_intervention_loss_rm
        return ScenarioNarrative(
            no_action=(
                f"If no action is taken, projected mortality could reach {birds[0]}-{birds[1]} birds "
                f"over {assessment.projections.time_horizon_days} days, with RM {loss[0]:,.0f}-{loss[1]:,.0f} at risk."
            ),
            act_within_12_hours=(
                f"If action starts within 12 hours, the expected loss range drops toward RM {early[0]:,.0f}-{early[1]:,.0f} "
                "because heat stress and spread risk are reduced before the next mortality jump."
            ),
            act_within_48_hours=(
                "If action waits 48 hours, the farm may still avoid the worst case, but the rising trend can lock in "
                "higher mortality and reduce treatment options."
            ),
        )

    def _citation_for(self, section: str) -> Citation:
        profile = next((item for item in FALLBACK_PROFILES if item["section"] == section), FALLBACK_PROFILES[0])
        return Citation(
            source=profile["source"],
            section=profile["section"],
            page=profile["page"],
            relevance_score=0.72,
        )

    def _coerce_hypotheses(
        self,
        items: list[dict[str, Any]],
        context_chunks: list[dict[str, Any]],
    ) -> list[DiseaseHypothesis]:
        results: list[DiseaseHypothesis] = []
        allowed = {chunk["disease"] for chunk in context_chunks}
        for item in items[:3]:
            disease = self._normalize_text(item.get("disease"), "")
            if not disease or disease not in allowed:
                continue
            results.append(
                DiseaseHypothesis(
                    disease=disease,
                    confidence=max(0.0, min(1.0, float(item.get("confidence", 0.5)))),
                    reasoning=self._normalize_text(item.get("reasoning"), "Pattern match from retrieved disease context."),
                    matching_signals=[str(signal) for signal in item.get("matching_signals", [])][:4],
                    citations=self._coerce_citations(item.get("citations", []), disease),
                )
            )
        return results

    def _coerce_citations(self, items: list[dict[str, Any]], disease: str) -> list[Citation]:
        citations: list[Citation] = []
        for item in items[:2]:
            source = self._normalize_text(item.get("source"), "")
            section = self._normalize_text(item.get("section"), "")
            if source and section:
                citations.append(
                    Citation(
                        source=source,
                        section=section,
                        page=int(item.get("page", 1)) if str(item.get("page", "")).isdigit() else None,
                        relevance_score=0.72,
                    )
                )
        return citations or [self._citation_for(_section_for_disease(disease))]

    def _coerce_actions(self, items: list[dict[str, Any]]) -> list[RecommendedAction]:
        actions: list[RecommendedAction] = []
        for index, item in enumerate(items[:4]):
            action = self._normalize_text(item.get("action"), "")
            if not action:
                continue
            actions.append(
                RecommendedAction(
                    priority=index + 1,
                    action=action,
                    timeframe=self._normalize_text(item.get("timeframe"), "Within 12 hours"),
                    reason=self._normalize_text(item.get("reason"), "Recommended from current farm risk pattern."),
                    expected_impact=self._normalize_text(
                        item.get("expected_impact"),
                        "Reduces near-term outbreak risk and improves monitoring decisions.",
                    ),
                )
            )
        return actions

    def _coerce_narration(self, item: dict[str, Any], assessment: RiskAssessment) -> ScenarioNarrative:
        fallback = self._build_narration(assessment)
        return ScenarioNarrative(
            no_action=self._normalize_text(item.get("no_action"), fallback.no_action),
            act_within_12_hours=self._normalize_text(
                item.get("act_within_12_hours"),
                fallback.act_within_12_hours,
            ),
            act_within_48_hours=self._normalize_text(
                item.get("act_within_48_hours"),
                fallback.act_within_48_hours,
            ),
        )

    def _normalize_text(self, value: Any, fallback: str) -> str:
        text = str(value).strip() if value is not None else ""
        return text or fallback


def _copy_model(model: RecommendedAction, **updates: Any) -> RecommendedAction:
    if hasattr(model, "model_copy"):
        return model.model_copy(update=updates)
    return model.copy(update=updates)


def _section_for_disease(disease: str) -> str:
    for item in FALLBACK_PROFILES:
        if item["disease"] == disease:
            return item["section"]
    return FALLBACK_PROFILES[0]["section"]


_SECTION_RE = re.compile(
    r"^(INTERPRETATION|INSIGHT|HYPOTHESIS_[123]|ACTION_[1234]|NO_ACTION|ACT_12H|ACT_48H)\s*:\s*(.*)$"
)


def _parse_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    current: str | None = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        match = _SECTION_RE.match(line)
        if match:
            current = match.group(1)
            sections[current] = match.group(2).strip()
        elif current and sections.get(current) is not None:
            sections[current] = (sections[current] + " " + line).strip()
    return sections
