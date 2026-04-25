# 4.3. AI Model & Prompt Design

## 4.3.1. Model Selection

TernakAI uses **Z.AI GLM** as an optional reasoning layer on top of a deterministic poultry-risk engine. The backend first computes a transparent `RiskAssessment` from farm data such as feed intake, temperature, mortality, ventilation condition, behaviour flags, and farmer notes. GLM is then used to convert that structured assessment into four outputs that deterministic scoring alone cannot provide well: **plain-language interpretation, ranked disease hypotheses, prioritised actions, and scenario narration**. This design is deliberate: the core scoring system remains usable without the model, while GLM adds the reasoning and communication layer needed for farmer decision support.

## 4.3.2. Prompting Strategy

The system uses a **two-stage grounded prompting flow**. First, it retrieves disease context from a local poultry knowledge base containing DVS/VRI, MARDI, and related veterinary reference chunks. Second, it sends that grounded context into **two separate GLM calls**: a **reasoning call** for interpretation and hypothesis ranking, followed by an **action-planning call** for recommendations and "what happens next" narration. The prompts are heavily structured and require fixed output sections such as `INTERPRETATION`, `HYPOTHESIS_1-3`, `ACTION_1-3`, `NO_ACTION`, `ACT_12H`, and `ACT_48H`. This reduces free-form drift and keeps model outputs anchored to retrieved evidence and deterministic farm signals.

## 4.3.3. Context & Input Handling

The model does not receive raw, unconstrained chat logs. It is fed a compact farm-state summary built by the backend: current risk score and trend, deviations from baseline, flock metadata, recent trajectory, and short farmer notes. In the API schema, farmer notes are capped at **500 characters**, while structured fields such as ventilation condition and behaviour flags are validated against fixed enums. The system also supports **English, Bahasa Melayu, and bilingual ("bahasa rojak")** prompting modes, allowing short field notes like "ayam senyap sikit, kurang makan" to be incorporated directly into analysis.

## 4.3.4. Fallback & Failure Behavior

If the live GLM call fails, returns unusable structure, or the provider is unavailable, TernakAI does **not** block the workflow. Instead, it falls back to an **offline local analysis path** that still returns interpretation, heuristic disease hypotheses, recommendations, and scenario narration using deterministic logic plus retrieved knowledge-base context. Outputs are explicitly labeled as either `z-ai-glm` or `offline-glm-fallback`, so the frontend can distinguish live model reasoning from local fallback behaviour. This architecture is important for field reliability: farmers still receive a working risk assessment and action guidance even when the external model layer is down.
