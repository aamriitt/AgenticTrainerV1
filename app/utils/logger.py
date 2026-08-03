"""
Shared logging setup.

Every agent module should do:

    from app.utils.logger import get_logger
    logger = get_logger(__name__)

This gives consistent formatting and a single place to change log
behavior (e.g. routing to a file, adding JSON formatting for log
aggregation tools) without touching every agent.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

from app.config import settings

_CONFIGURED = False


def _configure_root() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    log_dir = Path(settings.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)

    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    formatter = logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S")

    root = logging.getLogger("agentic_trainer")
    root.setLevel(level)
    root.propagate = False

    if not root.handlers:
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(formatter)
        root.addHandler(stream_handler)

        file_handler = logging.FileHandler(log_dir / "agentic_trainer.log", encoding="utf-8")
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced logger under the 'agentic_trainer' root logger."""
    _configure_root()
    return logging.getLogger(f"agentic_trainer.{name}")
