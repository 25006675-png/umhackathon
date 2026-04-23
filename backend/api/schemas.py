from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class FlockCreateInput(BaseModel):
    flock_id: str
    flock_size: int
    farm_id: str
    age_days: int

class DailyReadingInput(BaseModel):
    flock_id: str
    temperature_celsius: float
    feed_intake_kg: float
    mortality_count: int
    farmer_notes: Optional[str] = None

class FeedbackInput(BaseModel):
    flock_id: str
    action_taken: str
    outcome: str

class Signals(BaseModel):
    temperature_celsius: float
    feed_intake_kg: float
    mortality_count: int
    farmer_notes: Optional[str] = None

class Baselines(BaseModel):
    temperature_celsius: float
    feed_intake_kg: float
    mortality_count: float

class Deviations(BaseModel):
    temperature: float
    feed_intake: float
    mortality: float

class Risk(BaseModel):
    score: int
    level: str 
    trend: str 
    previous_scores: List[int]

class Projections(BaseModel):
    mortality_range_percent: List[int]
    mortality_range_birds: List[int]
    financial_loss_rm: List[int]
    early_intervention_loss_rm: List[int]
    time_horizon_days: int

class FarmDataResponse(BaseModel):
    farm_id: str
    flock_id: str
    flock_age_days: int
    flock_size: int
    timestamp: datetime
    signals: Signals
    baselines: Baselines
    deviations: Deviations
    risk: Risk
    projections: Projections
