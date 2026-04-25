# TernakAI System Architecture

## 1. System Summary

TernakAI is a two-tier application for poultry flock monitoring:

- A `FastAPI` backend handles data ingestion, daily aggregation, deterministic risk scoring, alerting, GLM orchestration, and retrieval from a local veterinary knowledge base.
- A `Next.js 14` frontend provides the operator UI for daily input, dashboard monitoring, trend analysis, AI-assisted interpretation, and chat.

The design is intentionally split into:

1. deterministic farm intelligence that works without an LLM
2. an optional GLM layer that converts scores into explanations, hypotheses, and actions

This is the right architectural choice for a demo and for production hardening later: the core risk engine remains available even when the GLM provider is unavailable.

## 2. High-Level Architecture

```text
it
```

## 3. Backend Architecture

### 3.1 API entrypoint

The backend entrypoint is [`backend/main.py`](/C:/Documents/umhack_ternakAI/backend/main.py).

It:

- creates the FastAPI app
- enables permissive CORS (`allow_origins=["*"]`)
- mounts four route groups:
  - `farm_data`
  - `analysis`
  - `glm`
  - `alerts`
- exposes `/health`, which also checks RAG readiness

### 3.2 Configuration

Runtime configuration lives in [`backend/config.py`](/C:/Documents/umhack_ternakAI/backend/config.py).

Important environment variables:

- `ILMU_API_KEY` / `Z_AI_API_KEY` / `ZAI_API_KEY`
- `Z_AI_ENDPOINT`
- `Z_AI_MODEL`
- `REQUEST_TIMEOUT_SECONDS`

The GLM integration defaults to the ILMU-compatible chat completions endpoint.

### 3.3 Persistence model

Operational state is stored in SQLite via [`backend/database/db.py`](/C:/Documents/umhack_ternakAI/backend/database/db.py).

Tables:

- `flocks`
- `readings`
- `daily_summaries`
- `alerts`
- `feedback`

Key behavior:

- schema migration is handled manually inside `_ensure_schema()`
- demo seed data is loaded from `data/seed/*.json`
- `init_db()` runs at module import time
- every reading insert triggers a full rebuild of that flock's `daily_summaries`

The `daily_summaries` table is the real operational pivot in the system. The frontend mostly consumes analysis derived from these summaries rather than raw readings.

### 3.4 Data ingestion and day lifecycle

The farm data routes live in [`backend/api/routes/farm_data.py`](/C:/Documents/umhack_ternakAI/backend/api/routes/farm_data.py).

Supported actions:

- register a flock
- submit a reading
- fetch a reading or reading history
- clear today's readings
- mark a date as complete

Important lifecycle rule:

- once a day is marked `official`, the backend blocks more inserts for that flock/date

This gives the project a simple but useful workflow:

1. farmers log partial readings during the day
2. the system keeps a `preliminary` summary
3. completion promotes the day to `official`

### 3.5 Deterministic analysis engine

The deterministic analysis pipeline is assembled in [`backend/api/routes/analysis.py`](/C:/Documents/umhack_ternakAI/backend/api/routes/analysis.py).

It pulls:

- flock metadata from SQLite
- the latest daily summary
- prior daily summaries for baseline and trend context

It then runs three engine layers:

#### Baseline layer

[`backend/engine/baseline.py`](/C:/Documents/umhack_ternakAI/backend/engine/baseline.py)

- computes a rolling 3-reading baseline
- normalizes earlier readings against current flock age and target timestamp
- returns baseline values for temperature, feed, mortality, and optionally water

#### Risk scoring layer

[`backend/engine/risk_scoring.py`](/C:/Documents/umhack_ternakAI/backend/engine/risk_scoring.py)

The risk model is transparent and additive:

- feed: max 20
- water: max 10
- temperature: max 20
- mortality: max 20
- air quality: max 15
- behaviour: max 10
- combination bonus: max 10
- sustained deterioration bonus: max 5

Output:

- score out of 100
- level: `Low`, `Moderate`, `High`, `Critical`
- trend: `stable`, `rising`, `falling`
- category breakdown for explainability

#### Projection layer

[`backend/engine/projection.py`](/C:/Documents/umhack_ternakAI/backend/engine/projection.py)

This maps risk level to a scenario-style estimate of:

- mortality range
- birds lost
- financial loss in RM
- reduced loss with early intervention

These are coarse demo projections, not statistical forecasts.

### 3.6 Alerts and feedback

Alert logic is split across:

- persistence in `database/db.py`
- alert endpoints in [`backend/api/routes/alerts.py`](/C:/Documents/umhack_ternakAI/backend/api/routes/alerts.py)
- automatic alert creation inside `analysis.py`

Current rule:

- when an `official` daily summary produces `High` or `Critical` risk, an alert is persisted

Feedback is stored, but it is not yet used to retrain or recalibrate the scoring or GLM outputs.

## 4. GLM and RAG Architecture

### 4.1 GLM API layer

The GLM routes are in [`backend/api/routes/glm.py`](/C:/Documents/umhack_ternakAI/backend/api/routes/glm.py).

They expose:

- `POST /api/glm/analyse/{flock_id}`
- `POST /api/glm/chat`
- `POST /api/glm/trends/{flock_id}`
- `GET /api/glm/compare/{flock_id}`

The GLM layer always tries to build a deterministic `RiskAssessment` first. If that fails, it falls back to a demo assessment.

### 4.2 GLM orchestration

The orchestration logic is in [`backend/glm/orchestrator.py`](/C:/Documents/umhack_ternakAI/backend/glm/orchestrator.py).

The live analysis path is a two-call structure:

1. reasoning call
   - produces interpretation, insight, and ranked hypotheses
2. action call
   - produces recommendations and scenario narration

If the provider is unavailable or the response is unusable, the system returns a deterministic fallback analysis with:

- heuristic disease ranking
- local recommendations
- local scenario narration

The output is explicitly labeled with:

- `generated_by = "z-ai-glm"` for live success
- `generated_by = "offline-glm-fallback"` for fallback

### 4.3 GLM provider client

The provider wrapper is [`backend/glm/client.py`](/C:/Documents/umhack_ternakAI/backend/glm/client.py).

Characteristics:

- async `httpx` client
- merged prompt payload rather than separate role messages
- simple retry behavior
- optional streaming support
- helper methods for `ping()` and `list_models()`

### 4.4 Retrieval-augmented generation

The RAG subsystem lives in [`backend/rag/retrieval.py`](/C:/Documents/umhack_ternakAI/backend/rag/retrieval.py).

It combines:

- `ChromaDB` persistent vector retrieval from `backend/rag/vector_db`
- local JSON chunk loading from `backend/rag/knowledge_base/*.json`
- a lexical reranker with source hints

Knowledge sources include PDF and chunked veterinary documents under `backend/rag/knowledge_base/`.

This is effectively a hybrid retrieval system:

1. semantic retrieval from Chroma
2. lexical scoring over the local chunk corpus
3. reranking and source-aware filtering

That retrieval output is used in two places:

- disease context for GLM analysis
- supporting context for chat answers

## 5. Frontend Architecture

### 5.1 Stack and structure

The frontend is a `Next.js 14` app-router application with `React`, `TypeScript`, `Tailwind CSS`, and `Recharts`.

Key locations:

- app routes: `frontend/app`
- reusable UI: `frontend/components`
- API client and local simulation helpers: `frontend/lib`

The root layout in [`frontend/app/layout.tsx`](/C:/Documents/umhack_ternakAI/frontend/app/layout.tsx) provides:

- persistent sidebar on desktop
- bottom navigation on mobile
- shared typography and global styling

### 5.2 Frontend data access

Most client-side integration is centralized in [`frontend/lib/api.ts`](/C:/Documents/umhack_ternakAI/frontend/lib/api.ts).

This file is doing three jobs:

1. backend API wrapper
2. demo fallback provider when `NEXT_PUBLIC_API_URL` is missing
3. client-side simulation utilities for trends and what-if analysis

This is practical for a hackathon, but it is also where architectural drift can appear because business logic now exists in both backend and frontend.

### 5.3 Primary frontend screens

Current user-facing screens:

- `/` today dashboard
- `/input` reading submission/edit
- `/analysis` AI interpretation and what-if analysis
- `/trends` multi-day trend analysis
- `/chat` conversational assistant
- `/history` and `/history/[date]` historical inspection

Typical page responsibilities:

- dashboard pulls current analysis, alerts, and short history
- input page submits or replaces today's reading
- analysis page requests GLM output plus AI follow-up explanations
- trends page combines history, window filters, charts, and AI summaries
- chat page sends free-form questions to the GLM chat endpoint

## 6. End-to-End Runtime Flows

### 6.1 Reading submission flow

```text
Frontend /input
    -> POST /api/readings
    -> SQLite readings insert
    -> rebuild daily_summaries for the flock
    -> frontend refreshes /api/analysis/{flock_id}
```

### 6.2 Deterministic analysis flow

```text
GET /api/analysis/{flock_id}
    -> fetch latest daily summary
    -> fetch prior summaries
    -> calculate baselines
    -> calculate deviations
    -> calculate risk score and trend
    -> calculate loss projections
    -> optionally persist alert
    -> return RiskAssessment JSON
```

### 6.3 GLM analysis flow

```text
POST /api/glm/analyse/{flock_id}
    -> build deterministic assessment
    -> build short trajectory context
    -> retrieve disease knowledge chunks
    -> reasoning call
    -> action call
    -> fallback locally if live call fails
    -> flatten response for frontend
```

### 6.4 Trend intelligence flow

```text
Frontend trends page
    -> getHistory()
    -> getAnalysis()
    -> request AI range explanation
    -> optionally request GLM analysis in parallel
    -> render charts + narrative + action guidance
```

## 7. Architectural Strengths

- The deterministic layer is independent from the LLM layer.
- The risk model is explainable and bounded.
- The day-level aggregation model is simple and workable for mobile farm input.
- The RAG design is local-first and does not depend on live retrieval infrastructure.
- The frontend can still function in demo mode without a backend URL.

## 8. Architectural Risks and Gaps

These are the main issues visible in the current implementation.

### 8.1 Database initialization has import side effects

`init_db()` is executed at the bottom of `backend/database/db.py`, so importing the module can mutate the database and reseed demo data. That is convenient for a demo but brittle for production.

### 8.2 Daily summary rebuild is full-table per flock

Every new reading rebuilds all daily summaries for that flock. This is acceptable at demo scale, but it will become inefficient once the number of readings grows.

### 8.3 Frontend duplicates scoring logic

`frontend/lib/api.ts` contains a local `computeRisk()` and scenario simulation logic that mirrors backend rules. This creates a real risk of frontend/backend drift.

### 8.4 Demo fallback can mask integration problems

When no backend URL is configured, the frontend silently uses dummy data. That is good for demos, but it can hide broken backend integration during development.

### 8.5 API contract drift exists in feedback

Backend feedback expects `action_taken` and `outcome`, but frontend `FeedbackInput` is typed as `helpful` and `comment`. That contract is currently inconsistent.

### 8.6 `models.py` is not the active persistence layer

[`backend/database/models.py`](/C:/Documents/umhack_ternakAI/backend/database/models.py) describes an ORM model set in comments only, but the application actually uses raw SQLite queries. That file is effectively placeholder documentation, not a live part of the system.

### 8.7 Security and tenancy are not implemented

Current backend behavior includes:

- no authentication
- no authorization
- permissive CORS
- single-tenant assumptions around demo flock IDs

That is acceptable for hackathon delivery, not for deployment.

## 9. Recommended Next Refactors

If this system is extended beyond demo scope, the next sensible steps are:

1. move database initialization out of import time and into explicit startup/migration steps
2. separate demo-mode fixtures from production data paths
3. extract shared risk rules into one source of truth, preferably backend only
4. formalize the API contract and fix the feedback schema mismatch
5. split `frontend/lib/api.ts` into API client, demo fixtures, and simulation helpers
6. add auth, farm tenancy boundaries, and tighter CORS rules
7. replace full daily-summary rebuilds with incremental updates

## 10. Bottom Line

TernakAI is architected as a deterministic poultry monitoring core with an AI reasoning layer attached above it. The system is coherent: readings become daily summaries, summaries become explainable risk scores, and risk assessments optionally become GLM-powered guidance grounded in local veterinary references.

For a hackathon system, the architecture is strong where it matters most: it preserves a usable product even when the model layer fails. The main debt is not conceptual. It is operational: import-time DB setup, duplicated frontend logic, and a few contract inconsistencies that should be cleaned up before scaling.
