# TernakAI

AI-Powered Decision Intelligence for Poultry Disease Prevention

Built for UMHack 2026 — Domain: AI for Economic Empowerment & Decision Intelligence

## Overview

TernakAI transforms fragmented farm signals into actionable decisions by combining deterministic early-warning detection with Z.AI GLM-powered reasoning, diagnosis, and decision support.

## Project Structure

```
ternakAI/
├── backend/              # Python FastAPI backend
│   ├── api/              # API routes and request/response schemas
│   ├── database/         # SQLite models and seed data
│   ├── engine/           # Deterministic engines (baseline, risk, projection)
│   ├── glm/              # Z.AI GLM integration and prompt chains
│   └── rag/              # RAG pipeline (embedding, retrieval, knowledge base)
├── frontend/             # Next.js frontend (dashboard + input form)
│   ├── app/              # Next.js app router pages
│   ├── components/       # Reusable UI components
│   └── lib/              # API client and utilities
├── data/                 # Seed data and demo scenario
│   └── seed/
└── docs/                 # Demo script, pitch notes
```

## Setup

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
| Person 1 | TBD | Data & Deterministic Engine |
| Person 2 | Zhuo Lin | GLM Integration & Reasoning |
| Person 3 | TBD | RAG & Knowledge Base |
| Person 4 | TBD | Frontend & Dashboard |
| Person 5 | TBD | Demo, Pitch & Integration |
