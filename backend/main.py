from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import farm_data, analysis, alerts

app = FastAPI(title="TernakAI Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(farm_data.router)
app.include_router(analysis.router)
app.include_router(alerts.router)

@app.get("/")
def read_root():
    return {"message": "TernakAI API is running."}