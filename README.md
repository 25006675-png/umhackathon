# Pitching Video

**10-minute pitching video with product demonstration:**  
https://drive.google.com/file/d/1ThucYZN7VLfYul8XoYbD5h9u8AxMIVtN/view?usp=sharing

# TernakAI

AI-Powered Decision Intelligence for Poultry Disease Prevention

Built for UMHack 2026 - Domain: AI for Economic Empowerment & Decision Intelligence

## Competition Submission

This repository is the **single submission link** for the competition. It is intended to contain all required deliverables:

1. `PRD` (Product Requirements Document) - PDF
2. `System Analysis / Architecture Document` - PDF
3. `QATD` (Quality Assurance / Testing Document) - PDF
4. `Pitch Deck` - PDF
5. `10-minute Pitching Video with Product Demonstration`
6. `Code Repository`

## Submission Notes

- All documentation must be uploaded to this GitHub repository in **PDF format**, not only as Markdown.
- The pitching video link is placed at the **top of this README** as required.
- Judges only need to open this repository link to access the full submission package.
- The main competition documents and slide deck are stored in the **project root** for easy access.

## Deliverables Map

Current repository materials relevant to the submission:

- Video: top section of this README
- Product Requirements Document: [`PRODUCT REQUIREMENT DOCUMENT (PRD).pdf`](PRODUCT%20REQUIREMENT%20DOCUMENT%20%28PRD%29.pdf)
- System Analysis Document: [`System Analysis Documentation.pdf`](System%20Analysis%20Documentation.pdf)
- QA / Testing Document: [`QUALITY ASSURANCE TESTING DOCUMENTATION (QATD) (1).pdf`](QUALITY%20ASSURANCE%20TESTING%20DOCUMENTATION%20%28QATD%29%20%281%29.pdf)
- Pitch Deck: [`UMHACKATHON 2026.pdf`](UMHACKATHON%202026.pdf)
- Codebase: `backend/`, `frontend/`, `data/`
- System writeups and supporting documents: `docs/`

Current source materials already in the repo:

- [`docs/proposal.md`](docs/proposal.md)
- [`docs/system_architecture.md`](docs/system_architecture.md)
- [`docs/current_risk_score_rules.md`](docs/current_risk_score_rules.md)
- [`docs/projection_rules.md`](docs/projection_rules.md)
- [`docs/api_contract.md`](docs/api_contract.md)
- [`docs/competition_submission_4_3.md`](docs/competition_submission_4_3.md)
- [`docs/work_split.md`](docs/work_split.md)


## Live Prototype

Prototype link:  
https://umhackathon-c2b2bqceb-choong-zhuo-lins-projects.vercel.app/

## Overview

TernakAI transforms fragmented farm signals into actionable decisions by combining a deterministic early-warning engine with a Z.AI GLM reasoning layer. The platform ingests daily poultry farm signals such as feed intake, temperature, mortality, ventilation condition, behaviour flags, and short farmer notes, then turns them into explainable risk scores, ranked disease hypotheses, recommended actions, and loss projections.

## System Summary

The product is designed in two layers:

1. A deterministic backend that computes baselines, deviations, risk scores, trends, alerts, and scenario projections.
2. A GLM-based reasoning layer that explains risk in plain language, grounds likely disease hypotheses against local veterinary references, and produces context-aware action guidance.

This separation is intentional. The core monitoring workflow remains usable even if the live model provider is unavailable.

## Project Structure

```text
ternakAI/
|-- backend/              # FastAPI backend
|   |-- api/              # API routes and schemas
|   |-- database/         # SQLite persistence and seed handling
|   |-- engine/           # Deterministic baseline, risk, projection logic
|   |-- glm/              # Z.AI GLM client, orchestration, prompts
|   `-- rag/              # Retrieval pipeline and veterinary knowledge base
|-- frontend/             # Next.js frontend
|   |-- app/              # App router pages
|   |-- components/       # Shared UI components
|   `-- lib/              # API client and frontend helpers
|-- data/                 # Seed scenarios and baseline data
`-- docs/                 # Submission docs and technical writeups
```

## Setup

Brief local setup:
- Start the backend from `backend/` after installing `requirements.txt`.
- Start the frontend from `frontend/` with `npm install` and `npm run dev`.
- Open the frontend in your browser after the backend API is running.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Team

| Role | Owner | Scope |
|------|-------|-------|
| Person 1 | Kean Hong | Data & Deterministic Engine |
| Person 2 | Zhuo Lin | GLM Integration & Reasoning |
| Person 3 | Kang Shi | RAG & Knowledge Base |
| Person 4 | Shen En | Frontend & Dashboard |
| Person 5 | Wei Yin | Demo, Pitch & Integration |
