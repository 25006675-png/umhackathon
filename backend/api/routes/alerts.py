# Alert Routes — Section 4
#
# GET  /api/alerts/{flock_id}          — get active alerts for a flock (array for FE)
# GET  /api/alerts/{flock_id}/history  — alert history
# POST /api/feedback                   — farmer confirms outcome / logs action taken

from fastapi import APIRouter, HTTPException
from api.schemas import FeedbackInput
from database.db import add_feedback, get_alerts, get_flock

router = APIRouter()


def _to_frontend_alert(row: dict) -> dict:
    level = row["level"]
    return {
        "id": f"alert_{row['alert_id']}",
        "flock_id": row["flock_id"],
        "risk_level": level,
        "trigger": f"Risk {level} ({row['score']}/100) — automatic threshold",
        "immediate_action": (
            "Contact a vet within 24 hours and improve ventilation immediately."
            if level in ("High", "Critical")
            else "Monitor readings closely over the next 12 hours."
        ),
        "created_at": row["timestamp"],
        "active": level in ("High", "Critical"),
    }


@router.get("/api/alerts/{flock_id}")
async def get_active_alerts(flock_id: str):
    if not get_flock(flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    alerts = get_alerts(flock_id)
    return [_to_frontend_alert(a) for a in alerts if a["level"] in ("High", "Critical")]


@router.get("/api/alerts/{flock_id}/history")
async def get_alert_history(flock_id: str):
    if not get_flock(flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    return [_to_frontend_alert(a) for a in get_alerts(flock_id)]


@router.post("/api/feedback")
async def submit_feedback(feedback: FeedbackInput):
    if not get_flock(feedback.flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    saved = add_feedback(feedback.flock_id, feedback.action_taken, feedback.outcome)
    return {"message": "Feedback logged for future refinement", **saved}
