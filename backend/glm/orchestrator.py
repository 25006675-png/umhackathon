# GLM Prompt Chain Orchestrator
#
# Chains the individual GLM prompts in sequence:
#   1. Interpretation (3.1)  — fuse signals into situation assessment
#   2. Hypothesis (3.2)      — RAG-grounded disease diagnosis
#   3. Insight (3.3)         — cross-signal pattern synthesis
#   4. Recommendation (3.4)  — prioritised action plan
#   5. Constraints (3.5)     — re-prioritise given farmer constraints
#   6. Narration (3.6)       — scenario comparison (act now vs. wait)
#
# Each step receives the accumulated context from prior steps.
# Also provides a "without GLM" mode that returns raw deterministic output only.
