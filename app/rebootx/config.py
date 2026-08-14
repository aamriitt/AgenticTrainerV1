"""RebootX settings adapter.

Uses Atlas env (OLLAMA_HOST / OLLAMA_MODEL / CHROMA_DIR) so one process
serves both Ask Atlas and tech-refresh assessments. Compatibility docs live
in a separate Chroma collection and a separate knowledge folder.
"""

from __future__ import annotations

import os
from pathlib import Path

from app.config import BASE_DIR, settings as atlas, _get_bool, _get_float, _get_int


class RebootXSettings:
    app_name = "RebootX"
    app_version = "0.1.0"

    ollama_base_url: str = atlas.ollama_host
    ollama_model: str = atlas.ollama_model
    use_ollama: bool = _get_bool("USE_OLLAMA", True)
    ollama_temperature: float = _get_float("OLLAMA_TEMPERATURE", 0.2)
    ollama_num_ctx: int = _get_int("OLLAMA_NUM_CTX", 4096)
    ollama_timeout: float = _get_float("OLLAMA_TIMEOUT", 120.0)
    ollama_health_timeout: float = _get_float("OLLAMA_HEALTH_TIMEOUT", 3.0)
    ollama_max_retries: int = _get_int("OLLAMA_MAX_RETRIES", 2)
    ollama_force_json: bool = _get_bool("OLLAMA_FORCE_JSON", True)

    chroma_persist_dir: str = str(atlas.chroma_dir)
    knowledge_dir: str = str(
        Path(os.getenv("REBOOTX_KNOWLEDGE_DIR", str(atlas.knowledge_dir / "rebootx"))).resolve()
    )
    scan_root: Path = BASE_DIR


settings = RebootXSettings()
