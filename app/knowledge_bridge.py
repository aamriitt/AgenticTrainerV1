"""Export RebootX JSON docs into Atlas SOP text files and index them.

Atlas `/ask` reads `enterprise_knowledge`. RebootX assessments read
`compatibility_knowledge`. This bridge copies the same facts into
`knowledge/sop/rebootx-*.txt` so Ask Atlas can cite upgrade guidance.
"""

from __future__ import annotations

from pathlib import Path

from app.config import settings
from app.rebootx.knowledge_loader import load_from_directory
from app.utils.logger import get_logger

logger = get_logger("knowledge_bridge")


def export_rebootx_docs_to_atlas_txt() -> list[Path]:
    docs = load_from_directory()
    out_dir = settings.knowledge_dir / "sop"
    out_dir.mkdir(parents=True, exist_ok=True)

    by_tech: dict[str, list[dict]] = {}
    for doc in docs:
        tech = str(doc["metadata"].get("technology_type") or "general")
        by_tech.setdefault(tech, []).append(doc)

    paths: list[Path] = []
    for tech, items in sorted(by_tech.items()):
        dest = out_dir / f"rebootx-{tech}-compatibility.txt"
        lines = [
            f"# RebootX compatibility knowledge — {tech}",
            "",
            "Enterprise upgrade guidance also used by the RebootX tech-refresh engine.",
            "Ask Atlas can retrieve these notes for Python, PostgreSQL, EMR, and MWAA upgrades.",
            "",
        ]
        for doc in items:
            meta = doc["metadata"]
            lines.append(f"## {doc['id']}")
            lines.append(f"Source: {meta.get('source', '')}")
            lines.append(f"Topic: {meta.get('topic', '')}")
            version_from = meta.get("version_from")
            version_to = meta.get("version_to")
            if version_from or version_to:
                lines.append(f"Upgrade path: {version_from or '?'} → {version_to or '?'}")
            if meta.get("risk_hint"):
                lines.append(f"Risk hint: {meta['risk_hint']}")
            lines.append("")
            lines.append(doc["text"].strip())
            lines.append("")
        dest.write_text("\n".join(lines), encoding="utf-8")
        paths.append(dest)
        logger.info("Wrote Atlas KB file %s (%s documents)", dest.name, len(items))
    return paths


def ingest_rebootx_into_atlas(pipeline) -> int:
    """Index the exported SOP files into Atlas Chroma (idempotent per source_id)."""
    paths = export_rebootx_docs_to_atlas_txt()
    total = 0
    for path in paths:
        try:
            total += pipeline.ingest_and_index(str(path))
        except Exception:
            logger.exception("Failed to index %s into Atlas", path)
    logger.info("RebootX→Atlas ingest complete: %s chunks", total)
    return total
