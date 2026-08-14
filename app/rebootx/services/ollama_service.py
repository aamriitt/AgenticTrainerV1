"""Ollama LLM integration with graceful fallback.

Provides:
- server reachability + model-present detection (structured status)
- JSON-mode generation (Ollama ``format="json"``) for reliable parsing
- bounded retries on transient failures
- robust JSON extraction as a second line of defence
"""

import asyncio
import json
import logging
import re
from dataclasses import dataclass

import httpx

from app.rebootx.config import settings

logger = logging.getLogger(__name__)


@dataclass
class LLMStatus:
    """Structured view of the LLM backend health."""

    enabled: bool
    server_up: bool
    model: str
    model_present: bool
    base_url: str
    available_models: list[str]
    detail: str

    @property
    def available(self) -> bool:
        """True only when we can actually run an assessment through the model."""
        return self.enabled and self.server_up and self.model_present

    def to_dict(self) -> dict:
        return {
            "enabled": self.enabled,
            "server_up": self.server_up,
            "model": self.model,
            "model_present": self.model_present,
            "available": self.available,
            "base_url": self.base_url,
            "available_models": self.available_models,
            "detail": self.detail,
        }


class OllamaService:
    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model

    def _model_matches(self, tag: str) -> bool:
        """Ollama tags include a ``:tag`` suffix (e.g. ``llama3:latest``).

        Treat a bare configured name (``llama3``) as matching ``llama3:latest``
        and any explicit tag.
        """
        wanted = self.model.lower()
        tag = tag.lower()
        return tag == wanted or tag.split(":")[0] == wanted.split(":")[0]

    async def list_models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=settings.ollama_health_timeout) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                return [m.get("name", "") for m in data.get("models", []) if m.get("name")]
        except httpx.HTTPError:
            return []

    async def status(self) -> LLMStatus:
        """Return a structured health snapshot of the LLM backend."""
        if not settings.use_ollama:
            return LLMStatus(
                enabled=False,
                server_up=False,
                model=self.model,
                model_present=False,
                base_url=self.base_url,
                available_models=[],
                detail="LLM disabled via configuration (use_ollama=false). Using rules-based analysis.",
            )

        models = await self.list_models()
        server_up = bool(models) or await self._ping()
        if not server_up:
            return LLMStatus(
                enabled=True,
                server_up=False,
                model=self.model,
                model_present=False,
                base_url=self.base_url,
                available_models=[],
                detail=f"Ollama server not reachable at {self.base_url}. Start it with 'ollama serve'.",
            )

        model_present = any(self._model_matches(m) for m in models)
        if model_present:
            detail = f"Ready: model '{self.model}' is available for AI assessments."
        else:
            detail = (
                f"Server is up but model '{self.model}' is not pulled. "
                f"Run 'ollama pull {self.model}'. Available: {', '.join(models) or 'none'}."
            )
        return LLMStatus(
            enabled=True,
            server_up=True,
            model=self.model,
            model_present=model_present,
            base_url=self.base_url,
            available_models=models,
            detail=detail,
        )

    async def _ping(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=settings.ollama_health_timeout) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except httpx.HTTPError:
            return False

    async def is_available(self) -> bool:
        """Backwards-compatible availability check (server up AND model present)."""
        return (await self.status()).available

    async def generate(self, prompt: str, system: str | None = None) -> str | None:
        payload: dict = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": settings.ollama_temperature,
                "num_ctx": settings.ollama_num_ctx,
            },
        }
        if system:
            payload["system"] = system
        if settings.ollama_force_json:
            # Ollama constrains output to valid JSON when format="json".
            payload["format"] = "json"

        last_error: Exception | None = None
        for attempt in range(1, settings.ollama_max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
                    response = await client.post(f"{self.base_url}/api/generate", json=payload)
                    response.raise_for_status()
                    data = response.json()
                    return data.get("response", "").strip()
            except httpx.HTTPError as exc:
                last_error = exc
                logger.warning(
                    "Ollama request failed (attempt %s/%s): %s",
                    attempt,
                    settings.ollama_max_retries,
                    exc,
                )
                if attempt < settings.ollama_max_retries:
                    await asyncio.sleep(0.5 * attempt)

        logger.warning("Ollama generation gave up after %s attempts: %s", settings.ollama_max_retries, last_error)
        return None

    @staticmethod
    def extract_json(text: str) -> dict | None:
        if not text:
            return None

        # Direct parse first (format="json" usually returns clean JSON).
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if fenced:
            try:
                return json.loads(fenced.group(1))
            except json.JSONDecodeError:
                pass

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return None
        return None
