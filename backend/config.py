from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import find_dotenv, load_dotenv


load_dotenv(find_dotenv(usecwd=True))


@dataclass(frozen=True)
class Settings:
    z_ai_api_key: str | None = (
        os.getenv("ILMU_API_KEY")
        or os.getenv("Z_AI_API_KEY")
        or os.getenv("ZAI_API_KEY")
    )
    z_ai_endpoint: str = os.getenv(
        "Z_AI_ENDPOINT",
        os.getenv("ZAI_API_URL", os.getenv("ILMU_API_URL", "https://api.ilmu.ai/v1/chat/completions")),
    )
    z_ai_model: str = os.getenv("Z_AI_MODEL", os.getenv("ILMU_MODEL", "nemo-super"))
    request_timeout_seconds: float = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "300"))


settings = Settings()
