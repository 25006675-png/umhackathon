from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import alerts, analysis, farm_data, glm


app = FastAPI(
    title="TernakAI API",
    description="AI-powered decision intelligence for poultry disease prevention.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(glm.router)
app.include_router(farm_data.router)
app.include_router(analysis.router)
app.include_router(alerts.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
