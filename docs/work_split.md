# TernakAI — Work Split & Timeline

## Team Overview

| Role | Owner | Scope | Key Output |
|---|---|---|---|
| Person 1 | TBD | Data & Deterministic Engine (Layers 1–4) | JSON API: risk score, deviations, projections |
| Person 2 | Zhuo Lin | GLM Integration & Reasoning (Sections 3.1–3.6) | GLM prompt chain, interpretation, recommendations |
| Person 3 | TBD | RAG & Knowledge Base (Sections 3.8, 3.2) | Retrieval pipeline with citations |
| Person 4 | TBD | Frontend & Dashboard (Sections 4, 5, 7) | Mobile-first UI, input form, dashboard |
| Person 5 | TBD | Demo, Pitch & Integration (Sections 7, 8, 9) | End-to-end demo, pitch deck, testing |

## File Ownership

| Person | Files |
|---|---|
| **P1** (Data Engine) | `backend/engine/*`, `backend/database/*`, `backend/api/routes/farm_data.py`, `backend/api/routes/analysis.py`, `backend/api/schemas.py`, `data/seed/*` |
| **P2 — Zhuo Lin** (GLM) | `backend/glm/*` (client, orchestrator, all prompts), `backend/api/routes/glm.py` |
| **P3** (RAG) | `backend/rag/*` (chunker, embeddings, retrieval), `backend/rag/knowledge_base/*` |
| **P4** (Frontend) | `frontend/*` (all pages, components, lib) |
| **P5** (Demo/Pitch) | `docs/*`, `data/seed/*` (shared with P1), `backend/api/routes/alerts.py` |
| **Shared** | `backend/main.py`, `backend/config.py`, `.env.example`, `README.md` |

---

## Critical First-Hour Agreement: Data Handoff Schema

Before anyone writes code, Person 1 and Person 2 must agree on this JSON contract. Everyone builds against it.

```json
{
  "farm_id": "farm_001",
  "flock_id": "flock_2026_batch3",
  "flock_age_days": 28,
  "flock_size": 5000,
  "timestamp": "2026-04-23T08:00:00+08:00",
  "signals": {
    "temperature_celsius": 33.5,
    "feed_intake_kg": 42.0,
    "mortality_count": 3,
    "farmer_notes": "ayam senyap sikit, kurang makan"
  },
  "baselines": {
    "temperature_celsius": 30.2,
    "feed_intake_kg": 51.3,
    "mortality_count": 1.0
  },
  "deviations": {
    "temperature": 0.109,
    "feed_intake": -0.181,
    "mortality": 2.0
  },
  "risk": {
    "score": 72,
    "level": "High",
    "trend": "rising",
    "previous_scores": [35, 42, 58, 72]
  },
  "projections": {
    "mortality_range_percent": [30, 50],
    "mortality_range_birds": [1500, 2500],
    "financial_loss_rm": [10500, 17500],
    "early_intervention_loss_rm": [1750, 3500],
    "time_horizon_days": 5
  }
}
```

**Person 4** also builds against this schema — use it as dummy data for frontend development from hour 1.

---

## Detailed Role Breakdown

### Person 1 — Data & Deterministic Engine (Layers 1–4)

**Owns:** Everything from raw input to the JSON output above.

**Deliverables:**
1. **Data input API** — POST endpoint accepting daily farm readings (temperature, feed, mortality, farmer notes)
2. **Baseline calculator** — 3-day rolling average per signal, adjusted for flock age
3. **Deviation engine** — computes `(current - baseline) / baseline` per signal
4. **Risk scoring engine** — weighted composite score with these weights:
   - Feed drop: 0.35
   - Temperature change: 0.25
   - Mortality increase: 0.25
   - Multi-signal interaction: 0.15
5. **Projection engine** — maps risk score to mortality range and RM loss estimates
6. **Data storage** — SQLite database for historical readings (enables trend tracking)
7. **Seed data** — pre-populated 3-day outbreak scenario for demo (Day 1, Day 2, Day 3 readings)

**Tech:** Python (FastAPI), SQLite

**Key dependency:** Lock down the JSON schema with Person 2 in the first hour. Person 4 and Person 5 also consume this schema.

---

### Person 2 (Zhuo Lin) — GLM Integration & Reasoning (Sections 3.1–3.6)

**Owns:** All Z.AI GLM interactions. This is the core of the competition — the part judges care most about.

**Deliverables:**
1. **Interpretation engine prompt** — takes the JSON above + farmer notes → produces plain-language situation assessment
2. **Disease hypothesis prompt** — takes risk data + RAG context from Person 3 → produces ranked diagnoses with citations
3. **Action recommendation prompt** — takes risk + diagnosis → produces prioritised, specific action plan
4. **Constraint-based reasoning prompt** — takes action plan + farmer constraints → re-prioritises given real-world limits
5. **Scenario narration prompt** — takes projections → produces "if no action / if act now / if act late" comparison narrative
6. **GLM orchestration layer** — chains the above prompts in sequence, passing context between them
7. **"Without GLM" comparison** — a toggle/endpoint that returns only raw deterministic output (no interpretation, no recommendations) to demonstrate system degradation

**Tech:** Python, Z.AI API (HTTP calls or SDK)

**Key dependencies:**
- Person 1's JSON output (agree on schema in first hour, use dummy data until backend is live)
- Person 3's RAG retrieval results (start with hardcoded disease profiles, swap in real retrieval when ready)

**Prompt engineering priority order:**
1. Interpretation engine (highest visibility in demo)
2. Action recommendations (most practical value)
3. Disease hypothesis with RAG (strongest technical differentiator)
4. Scenario narration (most compelling for pitch)
5. Constraint-based reasoning (bonus depth)

---

### Person 3 — RAG & Knowledge Base (Sections 3.8, 3.2)

**Owns:** The veterinary knowledge that grounds GLM outputs in authoritative sources.

**Deliverables:**
1. **Source collection** — gather PDFs/documents from:
   - DVS Malaysia disease management protocols (publicly available sections)
   - MARDI poultry research publications
   - OIE/WOAH Terrestrial Manual — poultry disease chapters (CRD, Newcastle, Avian Influenza, Heat Stress)
2. **Document processing** — extract text, clean, chunk into retrieval-friendly segments (~200–500 tokens per chunk)
3. **Embedding & indexing** — embed chunks using available embedding model, store in FAISS or ChromaDB
4. **Retrieval API** — endpoint that takes a symptom pattern / query and returns top-K relevant chunks with source metadata
5. **Citation formatting** — ensure retrieved chunks carry source name, section, and page number for GLM to cite
6. **Fallback profiles** — if full RAG pipeline isn't ready in time, prepare 5–8 hardcoded disease profile documents that Person 2 can use directly:
   - Chronic Respiratory Disease (CRD)
   - Newcastle Disease
   - Infectious Bronchitis
   - Heat Stress
   - Avian Influenza (HPAI)
   - Coccidiosis
   - E. coli infection
   - Gumboro Disease (IBD)

**Tech:** Python, FAISS or ChromaDB, sentence-transformers or Z.AI embeddings

**Key dependency:** Person 2 needs retrieval results to build the hypothesis generator. Deliver the fallback profiles early (within first few hours) so Person 2 isn't blocked. Full RAG pipeline can come later.

---

### Person 4 — Frontend & Dashboard (Sections 4, 5, 7)

**Owns:** Everything the user sees and interacts with.

**Deliverables:**
1. **Daily input form** — mobile-optimised form for:
   - Shed temperature
   - Feed intake (kg)
   - Mortality count
   - Farmer notes (free text, supports Malay)
2. **Dashboard — main view:**
   - Risk score gauge (colour-coded: green/yellow/orange/red)
   - Risk trend line chart (last 7 days)
   - Signal breakdown cards (feed, temp, mortality with deviation arrows)
   - GLM interpretation panel (plain-language assessment)
   - Recommended actions list (prioritised, numbered)
   - Projection summary (mortality range, RM loss, with/without action comparison)
3. **Alert banner** — prominent visual alert when risk crosses threshold
4. **"Without GLM" toggle** — switch that hides GLM panels and shows only raw numbers (for demo)
5. **(Stretch) Chat interface** — simple text input where farmer can ask follow-up questions in Malay/English

**Tech:** React (Next.js) or Flutter Web, Tailwind CSS, Chart.js or Recharts

**Design principles:**
- Mobile-first (most farmers will use phones)
- Minimal text, heavy use of colour and icons
- Malay labels with English fallback
- Assume limited tech literacy — large touch targets, clear hierarchy

**Key dependency:** Use the agreed JSON schema as dummy data from hour 1. Don't wait for the backend. Swap to live API when Person 1's endpoints are ready.

---

### Person 5 — Demo, Pitch & Integration (Sections 7, 8, 9)

**Owns:** The story, the demo script, integration testing, and the final presentation.

**Deliverables:**
1. **Demo scenario script** — the 3-day outbreak timeline with exact numbers:
   - Day 1: Early signals, Moderate risk, GLM suggests monitoring
   - Day 2: Escalation, High risk, GLM diagnoses CRD, recommends specific actions
   - Day 3: Comparison — "with TernakAI" (losses contained at 5–10%) vs. "without" (losses hit 30–50%)
2. **Seed data** — work with Person 1 to pre-load the demo scenario into the database
3. **GLM centrality argument** — prepare the "with vs. without GLM" side-by-side comparison for judges
4. **Capability mapping slide** — visual table showing how TernakAI maps to all 4 competition requirements
5. **Pitch deck / script** (if presentation required):
   - Problem (30 seconds)
   - Solution overview (60 seconds)
   - Live demo walkthrough (2–3 minutes)
   - GLM centrality proof (30 seconds)
   - Impact numbers (30 seconds)
6. **Integration testing** — daily (or every few hours), run the full pipeline end-to-end:
   - Input data → Person 1's engine → Person 2's GLM → Person 4's dashboard
   - Verify RAG citations from Person 3 appear in GLM output
   - Test the "without GLM" toggle
7. **Bug triage** — when integration breaks, identify which person's component is the issue and coordinate the fix

**Key dependency:** This person must be testing the pipeline early and often, not just at the end. Start integration testing as soon as Person 1 and Person 2 have even a partial pipeline working.

---

## Timeline (Assuming 24-Hour Hackathon)

### Hour 0–1: Schema Lock & Setup

| Who | Task |
|---|---|
| All | Agree on JSON schema (see above), set up shared repo, decide tech stack |
| Person 1 | Set up FastAPI project, define API endpoints (stubs) |
| Person 2 | Test Z.AI API access, confirm GLM capabilities (bilingual? function calling? context window?) |
| Person 3 | Begin sourcing DVS/MARDI/OIE documents |
| Person 4 | Scaffold frontend project, build input form with dummy data |
| Person 5 | Draft demo scenario script with exact Day 1/2/3 numbers |

### Hour 1–6: Core Build (Parallel)

| Who | Task |
|---|---|
| Person 1 | Implement baseline, deviation, risk scoring, projection engines. Serve JSON via API. Create seed data for demo scenario. |
| Person 2 | Build interpretation engine prompt + action recommendation prompt. Test against dummy JSON. |
| Person 3 | Process documents, build chunk index. Deliver fallback disease profiles to Person 2 by hour 3–4. |
| Person 4 | Build dashboard layout — risk gauge, trend chart, signal cards, action list. All with dummy data. |
| Person 5 | Finalise demo script. Begin testing Person 1's API as soon as endpoints are live. |

**Checkpoint (Hour 6):** Person 1's API returns valid JSON. Person 2's interpretation prompt produces coherent output from dummy data. Person 4's dashboard renders with dummy data. Person 3 has fallback profiles ready.

### Hour 6–12: Integration & GLM Depth

| Who | Task |
|---|---|
| Person 1 | Connect frontend form → backend API. Fix any schema issues found during integration. |
| Person 2 | Build disease hypothesis prompt (with Person 3's retrieval/fallback data). Build scenario narration prompt. |
| Person 3 | Full RAG pipeline live — retrieval API returns relevant chunks with citations. |
| Person 4 | Connect dashboard to live API (Person 1). Render GLM responses (Person 2). Build alert banner. |
| Person 5 | First end-to-end integration test. Identify and file bugs. Test "without GLM" comparison. |

**Checkpoint (Hour 12):** Full pipeline works end-to-end: input → deterministic engine → GLM → dashboard. May have rough edges, but the flow is complete.

### Hour 12–18: Polish & Demo Prep

| Who | Task |
|---|---|
| Person 1 | Bug fixes, edge cases, ensure demo scenario data is clean |
| Person 2 | Prompt tuning based on integration test results. Add constraint-based reasoning. Polish output formatting. |
| Person 3 | Ensure citations render correctly in GLM output. Add more source coverage if time allows. |
| Person 4 | UI polish — colours, spacing, mobile responsiveness. Add "without GLM" toggle. (Stretch: chat interface) |
| Person 5 | Run demo scenario end-to-end multiple times. Time the demo. Prepare pitch script/deck. |

**Checkpoint (Hour 18):** Demo runs cleanly end-to-end. Pitch script is written. "Without GLM" comparison works.

### Hour 18–24: Final Polish & Rehearsal

| Who | Task |
|---|---|
| All | Full demo rehearsal (at least 2 dry runs) |
| Person 2 | Final prompt adjustments based on rehearsal feedback |
| Person 4 | Last UI tweaks, ensure nothing is broken on demo device |
| Person 5 | Rehearse pitch, time it, prepare for Q&A (especially GLM centrality questions) |

---

## Dependency Map

```
Person 1 (Data Engine)
  ├──→ Person 2 (GLM) — consumes JSON output
  ├──→ Person 4 (Frontend) — displays data + GLM results
  └──→ Person 5 (Demo) — needs seed data for scenario

Person 3 (RAG)
  └──→ Person 2 (GLM) — retrieval results feed hypothesis generator

Person 2 (GLM)
  └──→ Person 4 (Frontend) — GLM response text rendered in dashboard

Person 5 (Integration)
  └──→ Everyone — tests full pipeline, reports issues back to owner
```

**Critical path:** Person 1 → Person 2 → Person 4. If this chain breaks, the demo doesn't work. Protect it.

**Biggest risk:** Person 3's RAG pipeline not ready in time. **Mitigation:** Fallback disease profiles (hardcoded) delivered to Person 2 by hour 3–4, so GLM development is never blocked.

---

## Demo Day Checklist

- [ ] Demo scenario runs end-to-end without errors
- [ ] Day 1 → Day 2 → Day 3 progression shows clear risk escalation
- [ ] GLM outputs are coherent, specific, and cite sources
- [ ] "Without GLM" toggle shows clear degradation (numbers only, no interpretation)
- [ ] Dashboard is visually clean on mobile screen
- [ ] Pitch is timed and under the limit
- [ ] Team can answer: "What happens if you remove the GLM?"
- [ ] Team can answer: "How did you validate the impact numbers?"
- [ ] Team can answer: "Why poultry farmers specifically?"
