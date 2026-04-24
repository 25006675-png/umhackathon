from __future__ import annotations

from typing import Any

from api.schemas import RecommendedAction


SYSTEM_PROMPT = (
    "Re-prioritise farm actions under real constraints such as limited budget, "
    "labour, supplies, transport, and vet availability."
)


def build_constraints_prompt(
    actions: list[RecommendedAction],
    constraints: dict[str, Any],
) -> str:
    return f"""
Current action plan: {actions}
Farmer constraints: {constraints or {"none": "No constraints provided."}}

Re-rank actions and explain the trade-off for constrained execution.
""".strip()
