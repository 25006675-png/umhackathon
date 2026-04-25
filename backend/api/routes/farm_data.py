from datetime import date

from fastapi import APIRouter, HTTPException

from api.schemas import DailyReadingInput, DayCompletionResponse, FlockCreateInput
from database.db import (
    add_reading,
    complete_day,
    delete_today_readings,
    get_daily_summary,
    get_flock,
    get_reading,
    get_readings,
    register_flock,
)

router = APIRouter()

@router.post("/api/flocks", status_code=201)
async def create_flock(flock: FlockCreateInput):
    saved = register_flock(
        flock.flock_id,
        flock.flock_size,
        flock.farm_id,
        flock.age_days,
        flock.start_date,
    )
    return {"message": "Flock registered", "flock": saved}

@router.post("/api/readings", status_code=201)
async def submit_reading(reading: DailyReadingInput):
    if not get_flock(reading.flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")

    try:
        entry = add_reading(reading.dict())
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"message": "Reading saved", "data": entry}

@router.get("/api/readings/{reading_id}")
async def get_single_reading(reading_id: int):
    reading = get_reading(reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    return reading

@router.get("/api/flocks/{flock_id}/readings")
async def get_flock_readings(flock_id: str):
    if not get_flock(flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    return {"flock_id": flock_id, "history": get_readings(flock_id)}


@router.delete("/api/readings/today/{flock_id}", status_code=200)
async def clear_today_readings(flock_id: str):
    if not get_flock(flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    deleted = delete_today_readings(flock_id)
    return {"message": f"Cleared {deleted} reading(s) for today", "flock_id": flock_id}


@router.post("/api/flocks/{flock_id}/days/{reading_date}/complete", response_model=DayCompletionResponse)
async def complete_flock_day(flock_id: str, reading_date: date):
    if not get_flock(flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")

    summary = get_daily_summary(flock_id, reading_date.isoformat())
    if not summary:
        raise HTTPException(status_code=404, detail="Daily summary not found")

    if summary["status"] == "official" and summary.get("completed_at"):
        return DayCompletionResponse(
            flock_id=flock_id,
            reading_date=reading_date,
            analysis_status="official",
            completed_at=summary["completed_at"],
        )

    completed = complete_day(flock_id, reading_date.isoformat())
    if not completed or not completed.get("completed_at"):
        raise HTTPException(status_code=500, detail="Failed to complete day")

    return DayCompletionResponse(
        flock_id=flock_id,
        reading_date=reading_date,
        analysis_status="official",
        completed_at=completed["completed_at"],
    )
