from fastapi import APIRouter, HTTPException
from api.schemas import DailyReadingInput, FlockCreateInput
from database.db import add_reading, get_flock, get_reading, get_readings, register_flock

router = APIRouter()

@router.post("/api/flocks", status_code=201)
async def create_flock(flock: FlockCreateInput):
    saved = register_flock(flock.flock_id, flock.flock_size, flock.farm_id, flock.age_days)
    return {"message": "Flock registered", "flock": saved}

@router.post("/api/readings", status_code=201)
async def submit_reading(reading: DailyReadingInput):
    if not get_flock(reading.flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")

    entry = add_reading(reading.dict())
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
