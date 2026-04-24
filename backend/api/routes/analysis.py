# Analysis Routes — Layers 2-4 (Deterministic)
#
# GET /api/analysis/{flock_id}         — full risk assessment (deviations + risk + projections)
# GET /api/analysis/{flock_id}/trend   — risk score trend over last N days
# GET /api/analysis/{flock_id}/raw     — raw deterministic output only ("without GLM" mode)

from fastapi import APIRouter, HTTPException
from datetime import datetime
from api.schemas import FarmDataResponse, Signals, Baselines, Deviations, Risk, Projections
from database.db import add_alert, get_flock, get_readings
from engine.baseline import calculate_baselines, calculate_deviations
from engine.risk_scoring import calculate_risk
from engine.projection import calculate_projections

router = APIRouter()

def build_analysis(flock_id: str, persist_alert: bool = False):
    flock_info = get_flock(flock_id)
    history = get_readings(flock_id)
    if not flock_info or not history:
        raise HTTPException(status_code=404, detail="Flock or readings not found")

    current_reading = history[-1]

    # 1. Baselines & Deviations
    baselines = calculate_baselines(history[:-1]) # Baseline uses previous days
    deviations = calculate_deviations(current_reading, baselines)

    # 2. Risk Scoring
    previous_scores = calculate_risk_trend(history[:-1])
    risk = calculate_risk(deviations, previous_scores)

    # Trigger an alert if risk is High or Critical
    if persist_alert and risk["level"] in ["High", "Critical"]:
        add_alert(flock_id, risk["level"], risk["score"])

    # 3. Projections
    projections = calculate_projections(risk["level"], flock_info["flock_size"])

    return FarmDataResponse(
        farm_id=flock_info["farm_id"],
        flock_id=flock_id,
        flock_age_days=flock_info["flock_age_days"],
        flock_size=flock_info["flock_size"],
        timestamp=datetime.now(),
        signals=Signals(**current_reading),
        baselines=Baselines(**baselines),
        deviations=Deviations(**deviations),
        risk=Risk(**risk),
        projections=Projections(**projections)
    )

def calculate_risk_trend(history: list):
    scores = []
    for index in range(1, len(history)):
        baselines = calculate_baselines(history[:index])
        deviations = calculate_deviations(history[index], baselines)
        risk = calculate_risk(deviations, scores)
        scores.append(risk["score"])
    return scores[-3:]

@router.get("/api/analysis/{flock_id}", response_model=FarmDataResponse)
async def get_full_analysis(flock_id: str):
    return build_analysis(flock_id, persist_alert=True)

@router.get("/api/analysis/{flock_id}/trend")
async def get_analysis_trend(flock_id: str):
    if not get_flock(flock_id):
        raise HTTPException(status_code=404, detail="Flock not found")
    history = get_readings(flock_id)
    if not history:
        raise HTTPException(status_code=404, detail="Readings not found")
    return {"flock_id": flock_id, "risk_scores": calculate_risk_trend(history)}

@router.get("/api/analysis/{flock_id}/raw")
async def get_raw_analysis(flock_id: str):
    """Used for the 'Without GLM' demo toggle"""
    return build_analysis(flock_id)
