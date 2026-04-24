# API Contract

The agreed data handoff format between backend and frontend.
All team members build against this schema.

See `work_split.md` for the full JSON example.

## Endpoints

### Data Input
- `POST /api/flocks` - register flock metadata (`flock_id`, `farm_id`, `flock_size`, `age_days`, optional `start_date`)
- `POST /api/readings` - submit daily reading
- `GET /api/readings/{id}` - get specific reading
- `GET /api/flocks/{id}/readings` - reading history

`POST /api/readings` accepts:
- `flock_id`
- `temperature_celsius`
- `feed_intake_kg`
- `mortality_count`
- `farmer_notes` (optional)
- `timestamp` (optional ISO 8601 datetime, recommended for deterministic replay and frontend testing)

### Analysis (Deterministic)
- `GET /api/analysis/{flock_id}` - full risk assessment
- `GET /api/analysis/{flock_id}/trend` - risk trend
- `GET /api/analysis/{flock_id}/raw` - raw output only (no GLM)

Deterministic analysis guarantees:
- `flock_age_days` is calculated against the reading timestamp when `start_date` is available
- baselines use the last 3 readings and normalize prior readings to the current flock age
- projections remain the stable with/without-action numbers used in the demo seed scenario

### GLM Intelligence
- `POST /api/glm/analyse/{flock_id}` - full GLM chain
- `POST /api/glm/chat` - conversational follow-up (stretch)
- `GET /api/glm/compare/{flock_id}` - with vs. without GLM

### Alerts & Feedback
- `GET /api/alerts/{flock_id}` - active alerts
- `GET /api/alerts/{flock_id}/history` - alert history
- `POST /api/feedback` - farmer outcome confirmation
