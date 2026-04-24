# Alert Routes — Section 4
#
# GET  /api/alerts/{flock_id}          — get active alerts for a flock
# GET  /api/alerts/{flock_id}/history  — alert history
# POST /api/feedback                   — farmer confirms outcome / logs action taken (Section 6)

from fastapi import APIRouter, HTTPException
from api.schemas import FeedbackInput
from database.db import add_feedback, get_alerts, get_flock

router = APIRouter()

@router.get("/api/alerts/{flock_id}")
async def get_active_alerts(flock_id: str):
    if not get_flock(flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    alerts = get_alerts(flock_id)
    active = [a for a in alerts if a["level"] in ["High", "Critical"]]
    return {"flock_id": flock_id, "active_alerts": active}

@router.get("/api/alerts/{flock_id}/history")
async def get_alert_history(flock_id: str):
    if not get_flock(flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    return {"flock_id": flock_id, "alerts": get_alerts(flock_id)}

@router.post("/api/feedback")
async def submit_feedback(feedback: FeedbackInput):
    if not get_flock(feedback.flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    saved = add_feedback(feedback.flock_id, feedback.action_taken, feedback.outcome)
    return {"message": "Feedback logged for future refinement", **saved}
