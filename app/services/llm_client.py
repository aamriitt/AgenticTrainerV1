"""
Shared Ollama client.

Responsibility
--------------
Single place that knows how to talk to a local Ollama server running
Gemma 3. Both the Intent Agent (classification) and the Reasoning
Agent (answer generation) go through this, so there is exactly one
spot to change if the model, host, or calling convention changes.

Design notes
------------
- This requires Ollama to be installed and running locally
  (`ollama serve`, with `ollama pull gemma3` done beforehand). That
  is NOT available in this build/test sandbox, so `OllamaClient` is
  behind the same kind of injectable-interface pattern used for
  embeddings: callers can pass a stub client for testing without
  touching call sites.
- Calls are intentionally simple synchronous HTTP requests via the
  `ollama` Python package rather than raw `requests`, since it
  already handles streaming/non-streaming and error surfaces for us.
"""

from __future__ import annotations

from typing import Protocol

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("services.llm_client")


class LLMClient(Protocol):
    def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.1) -> str: ...


class OllamaClient:
    """Real backend: calls a local Ollama server."""

    def __init__(self, model: str | None = None, host: str | None = None):
        self.model = model or settings.ollama_model
        self.host = host or settings.ollama_host

    def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.1) -> str:
        try:
            import ollama
        except ImportError as e:
            raise RuntimeError(
                "The 'ollama' package is not installed. Run: pip install ollama"
            ) from e

        client = ollama.Client(host=self.host)
        try:
            response = client.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                options={"temperature": temperature},
            )
        except Exception as e:
            raise RuntimeError(
                f"Failed to reach Ollama at {self.host} with model '{self.model}'. "
                f"Is 'ollama serve' running and has 'ollama pull {self.model}' been run? "
                f"Original error: {e}"
            ) from e

        return response["message"]["content"].strip()
