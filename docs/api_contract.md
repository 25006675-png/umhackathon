# API Contract

The agreed data handoff format between backend and frontend.
All team members build against this schema.

See `work_split.md` for the full JSON example.

## Endpoints

### Data Input
- `POST /api/readings` — submit daily reading
- `GET /api/readings/{id}` — get specific reading
- `GET /api/flocks/{id}/readings` — reading history

### Analysis (Deterministic)
- `GET /api/analysis/{flock_id}` — full risk assessment
- `GET /api/analysis/{flock_id}/trend` — risk trend
- `GET /api/analysis/{flock_id}/raw` — raw output only (no GLM)

### GLM Intelligence
- `POST /api/glm/analyse/{flock_id}` — full GLM chain
- `POST /api/glm/chat` — conversational follow-up (stretch)
- `GET /api/glm/compare/{flock_id}` — with vs. without GLM

### Alerts & Feedback
- `GET /api/alerts/{flock_id}` — active alerts
- `GET /api/alerts/{flock_id}/history` — alert history
- `POST /api/feedback` — farmer outcome confirmation
