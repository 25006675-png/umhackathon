# Person 2 Architecture Update

This note documents only the updated Person 2 GLM architecture, not the full project design.

## What Changed

The original live path was a single loose text-generation flow. It has been replaced with a more reliable structured design that keeps GLM central to the reasoning layer while preserving deterministic fallback.

## Updated GLM Flow

### 1. Two-call structured GLM analysis

The `backend/glm/orchestrator.py` live path now uses two compact GLM calls:

1. `reasoning_call`
   - Input: risk assessment, farmer notes, ranked fallback disease context
   - Output target:
     - `interpretation`
     - `hypotheses`
     - `insight`

2. `action_call`
   - Input: risk assessment, top hypotheses, farmer constraints, projections
   - Output target:
     - `recommendations`
     - `constraint_adjusted_plan`
     - `narration`

This replaces the earlier step-by-step prompt chain for live generation.

### 2. Deterministic fallback remains first-class

If the live provider fails, times out, returns unusable content, or returns invalid JSON, the orchestrator falls back to the local deterministic Person 2 path:

- fallback interpretation
- fallback ranked hypotheses
- fallback recommendations
- fallback constraint adjustment
- fallback narration

The response explicitly marks this with:

- `generated_by = "offline-glm-fallback"`

If the live path succeeds:

- `generated_by = "z-ai-glm"`

## Why This Update Was Made

The provider account currently exposes only one allowed live model:

- `ilmu-glm-5.1`

During testing, this model was able to pass a tiny connectivity prompt but was unreliable on richer analysis prompts. The updated architecture reduces failure propagation by:

- collapsing live reasoning into two calls instead of many
- validating structured outputs before returning them
- preserving a stable fallback path for demo reliability

## Updated Client Behavior

The GLM client in `backend/glm/client.py` was simplified to use the request shape the current ILMU endpoint accepts more reliably:

- one merged user message instead of separate system/user roles
- no `thinking`
- no `chat_template_kwargs`
- no enforced `response_format`
- plain-text response handling with local JSON extraction
- retry loop for transient failures

It also now supports:

- `list_models()` for live preflight validation
- `ping()` for a minimal live connectivity test

## Updated Test Behavior

The Person 2 test script now includes:

- live preflight model listing
- live connectivity ping
- scenario validation against the new trace shape:
  - `reasoning_call`
  - `action_call`

The script can be run in three modes:

```bash
python test_person2_glm.py
python test_person2_glm.py --live-glm --show-output
python test_person2_glm.py --live-glm --require-live --show-output
```

Meaning:

- default mode validates fallback architecture
- `--live-glm` confirms API connectivity and then runs scenarios
- `--require-live` fails if scenario generation falls back

## Files Updated For This Architecture

- `backend/glm/client.py`
- `backend/glm/orchestrator.py`
- `backend/glm/prompts/interpretation.py`
- `backend/glm/prompts/recommendation.py`
- `backend/api/routes/glm.py`
- `backend/test_person2_glm.py`

## Current Status

### Confirmed working

- live API connectivity preflight
- model listing
- fallback scenario analysis
- structured two-call prompt trace

### Not yet fully reliable

- full live scenario analysis for all farm-sized prompts on `ilmu-glm-5.1`

As of this update, the architecture is ready for stable fallback operation and live connectivity verification, while the richer live analysis path still needs provider-specific prompt tuning.
