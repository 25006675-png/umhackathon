from __future__ import annotations

from dataclasses import dataclass
import asyncio
import json

import httpx

from config import settings


class GLMClientError(RuntimeError):
    pass


@dataclass
class GLMClient:
    api_key: str | None = settings.z_ai_api_key
    endpoint: str = settings.z_ai_endpoint
    model: str = settings.z_ai_model
    timeout_seconds: float = settings.request_timeout_seconds

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 700,
        stream: bool = False,
    ) -> str:
        if not self.api_key:
            raise GLMClientError("Z.AI API key is not configured.")

        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": _merge_prompts(system_prompt, user_prompt)},
            ],
            "thinking": {"type": "disabled"},
            "temperature": 0.2,
            "max_tokens": max_tokens,
            "stream": stream,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        last_error: Exception | None = None
        for attempt in range(2):
            try:
                if stream:
                    return await self._post_streaming(payload, headers)
                return await self._post_blocking(payload, headers)
            except (httpx.HTTPError, GLMClientError) as exc:
                last_error = exc
                if attempt < 1:
                    await asyncio.sleep(1.0)
                    continue
        raise GLMClientError(str(last_error) if last_error else "GLM request failed.")

    async def _post_blocking(self, payload: dict, headers: dict) -> str:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(self.endpoint, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        try:
            message = data["choices"][0]["message"]
            content = message.get("content") or message.get("reasoning_content")
        except (KeyError, IndexError, TypeError) as exc:
            raise GLMClientError("Unexpected Z.AI response format.") from exc
        if not content:
            raise GLMClientError("Z.AI response did not include visible content.")
        return content

    async def _post_streaming(self, payload: dict, headers: dict) -> str:
        chunks: list[str] = []
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            async with client.stream("POST", self.endpoint, json=payload, headers=headers) as response:
                response.raise_for_status()
                async for raw_line in response.aiter_lines():
                    if not raw_line:
                        continue
                    line = raw_line.strip()
                    if line.startswith("data:"):
                        line = line[len("data:"):].strip()
                    if not line or line == "[DONE]":
                        continue
                    try:
                        event = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    try:
                        delta = event["choices"][0].get("delta") or event["choices"][0].get("message") or {}
                    except (KeyError, IndexError, TypeError):
                        continue
                    piece = delta.get("content") or delta.get("reasoning_content")
                    if piece:
                        chunks.append(piece)
        if not chunks:
            raise GLMClientError("Stream completed without any content.")
        return "".join(chunks)

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 700,
    ) -> dict:
        budgets = [max_tokens, min(max_tokens + 300, 1100)]
        last_error: Exception | None = None
        last_content = ""
        for budget in budgets:
            content = await self.complete(
                system_prompt,
                user_prompt,
                max_tokens=budget,
            )
            last_content = content
            try:
                return json.loads(_extract_json_object(content))
            except json.JSONDecodeError as exc:
                last_error = exc
                continue
        raise GLMClientError(
            f"Model did not return valid JSON after retries. Last content head: {last_content[:200]!r}"
        ) from last_error

    async def list_models(self) -> list[str]:
        if not self.api_key:
            raise GLMClientError("Z.AI API key is not configured.")
        models_endpoint = self.endpoint.rsplit("/", 2)[0] + "/models"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.get(models_endpoint, headers=headers)
            response.raise_for_status()
            data = response.json()
        try:
            return [item["id"] for item in data["data"]]
        except (KeyError, TypeError) as exc:
            raise GLMClientError("Model list response format was unexpected.") from exc

    async def ping(self) -> str:
        return await self.complete(
            "",
            "Reply with the single word OK.",
            max_tokens=100,
        )


def _extract_json_object(content: str) -> str:
    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return content
    return content[start : end + 1]


def _merge_prompts(system_prompt: str, user_prompt: str) -> str:
    if not system_prompt.strip():
        return user_prompt
    return f"{system_prompt.strip()}\n\n{user_prompt.strip()}"
