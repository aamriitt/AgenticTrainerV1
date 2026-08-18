"""
Central configuration for the Agentic Trainer application.

All environment-driven settings are loaded once here and imported
elsewhere as `from app.config import settings`. Keeping this in one
place avoids scattering `os.getenv` calls across the codebase and
makes the whole system easy to reconfigure for different deployments
(local laptop, on-prem server, cloud VM).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Load .env if present. Safe to call even if the file doesn't exist.
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


def _get_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
    val = os.getenv(name)
    return int(val) if val else default


def _get_float(name: str, default: float) -> float:
    val = os.getenv(name)
    return float(val) if val else default


@dataclass(frozen=True)
class Settings:
    # --- Paths ---
    base_dir: Path = BASE_DIR
    knowledge_dir: Path = field(
        default_factory=lambda: Path(os.getenv("KNOWLEDGE_DIR", "./knowledge")).resolve()
    )
    chroma_dir: Path = field(
        default_factory=lambda: Path(os.getenv("CHROMA_DIR", "./chroma_data")).resolve()
    )
    feedback_db_path: Path = field(
        default_factory=lambda: Path(os.getenv("FEEDBACK_DB_PATH", "./feedback.db")).resolve()
    )
    log_dir: Path = field(
        default_factory=lambda: Path(os.getenv("LOG_DIR", "./logs")).resolve()
    )

    # --- LLM ---
    ollama_host: str = field(default_factory=lambda: os.getenv("OLLAMA_HOST", "http://localhost:11434"))
    ollama_model: str = field(default_factory=lambda: os.getenv("OLLAMA_MODEL", "gemma3"))

    # --- Embeddings ---
    embedding_model: str = field(
        default_factory=lambda: os.getenv("EMBEDDING_MODEL", "BAAI/bge-base-en-v1.5")
    )

    # --- Chunking ---
    chunk_size: int = field(default_factory=lambda: _get_int("CHUNK_SIZE", 500))
    chunk_overlap: int = field(default_factory=lambda: _get_int("CHUNK_OVERLAP", 100))

    # --- Retrieval ---
    retrieval_top_k: int = field(default_factory=lambda: _get_int("RETRIEVAL_TOP_K", 5))
    hybrid_alpha: float = field(default_factory=lambda: _get_float("HYBRID_ALPHA", 0.5))

    # --- Verification ---
    min_context_chunks: int = field(default_factory=lambda: _get_int("MIN_CONTEXT_CHUNKS", 2))
    min_relevance_score: float = field(default_factory=lambda: _get_float("MIN_RELEVANCE_SCORE", 0.35))

    # --- Whisper ---
    whisper_model_size: str = field(default_factory=lambda: os.getenv("WHISPER_MODEL_SIZE", "base"))

    # --- Logging ---
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))

    # --- HTTP / frontend (set these for any non-local deploy) ---
    public_app_url: str = field(
        default_factory=lambda: os.getenv("PUBLIC_APP_URL", "http://localhost:5173").rstrip("/")
    )
    cors_origins: list[str] = field(
        default_factory=lambda: [
            o.strip()
            for o in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
            ).split(",")
            if o.strip()
        ]
    )
    sync_rebootx_kb_on_start: bool = field(
        default_factory=lambda: _get_bool("ATLAS_SYNC_REBOOTX_KB", True)
    )

    def ensure_dirs(self) -> None:
        """Create required directories if they don't already exist."""
        for d in (self.knowledge_dir, self.chroma_dir, self.log_dir):
            d.mkdir(parents=True, exist_ok=True)
        for sub in ("pdf", "videos", "faq", "sop"):
            (self.knowledge_dir / sub).mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
