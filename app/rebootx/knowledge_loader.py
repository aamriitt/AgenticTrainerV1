"""Load compatibility knowledge from JSON files in the knowledge/ directory."""

import json
import logging
from pathlib import Path

from app.rebootx.config import settings

logger = logging.getLogger(__name__)

REQUIRED_METADATA_FIELDS = {"technology_type", "source", "topic"}
VALID_TOPICS = {"version", "dependency", "config", "integration"}
VALID_TECH_TYPES = {"database", "emr", "python", "mwaa"}
# Validation check categories from the official spec ("Recommend validation checks")
VALID_VALIDATION_CHECKS = {
    "regression",
    "build",
    "integration",
    "data",
    "performance",
    "rollback",
    "security",
}
VALID_RISK_HINTS = {"Low", "Medium", "High", "Critical"}


def _knowledge_root() -> Path:
    return Path(settings.knowledge_dir)


def _validate_document(doc: dict, source_file: str) -> dict | None:
    doc_id = doc.get("id")
    text = doc.get("text", "").strip()
    metadata = dict(doc.get("metadata", {}))

    if not doc_id:
        logger.warning("Skipping document in %s: missing 'id'", source_file)
        return None
    if not text or len(text) < 20:
        logger.warning("Skipping document %s in %s: text too short", doc_id, source_file)
        return None
    if not REQUIRED_METADATA_FIELDS.issubset(metadata.keys()):
        logger.warning("Skipping document %s in %s: missing required metadata", doc_id, source_file)
        return None
    if metadata["technology_type"] not in VALID_TECH_TYPES:
        logger.warning("Skipping document %s: invalid technology_type", doc_id)
        return None
    if metadata["topic"] not in VALID_TOPICS:
        logger.warning("Skipping document %s: invalid topic '%s'", doc_id, metadata["topic"])
        return None

    # Optional: validation_checks — accept a list, keep only valid values, store as CSV
    # (ChromaDB metadata values must be scalars, so a list is serialized to a string).
    raw_checks = metadata.get("validation_checks")
    if raw_checks:
        if isinstance(raw_checks, str):
            raw_checks = [c.strip() for c in raw_checks.split(",") if c.strip()]
        valid_checks = [c for c in raw_checks if c in VALID_VALIDATION_CHECKS]
        invalid = set(raw_checks) - VALID_VALIDATION_CHECKS
        if invalid:
            logger.warning("Document %s: ignoring invalid validation_checks %s", doc_id, invalid)
        metadata["validation_checks"] = ",".join(valid_checks)
    else:
        metadata["validation_checks"] = ""

    # Optional: domain (e.g. "insurance", "general"); default to general
    metadata["domain"] = metadata.get("domain", "general")

    # Optional: risk_hint sanity check (non-fatal)
    if metadata.get("risk_hint") and metadata["risk_hint"] not in VALID_RISK_HINTS:
        logger.warning("Document %s: unusual risk_hint '%s'", doc_id, metadata["risk_hint"])

    return {"id": doc_id, "text": text, "metadata": metadata}


def load_from_directory(directory: Path | None = None) -> list[dict]:
    """Load all knowledge documents from JSON files under knowledge/."""
    root = directory or _knowledge_root()
    if not root.exists():
        logger.warning("Knowledge directory not found: %s", root)
        return []

    documents: list[dict] = []
    seen_ids: set[str] = set()

    for json_file in sorted(root.rglob("*.json")):
        if json_file.name.startswith("_"):
            continue

        try:
            with open(json_file, encoding="utf-8") as f:
                payload = json.load(f)
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to read %s: %s", json_file, exc)
            continue

        file_docs = payload if isinstance(payload, list) else payload.get("documents", [])
        for doc in file_docs:
            validated = _validate_document(doc, str(json_file))
            if validated and validated["id"] not in seen_ids:
                seen_ids.add(validated["id"])
                documents.append(validated)
            elif validated and validated["id"] in seen_ids:
                logger.warning("Duplicate document id '%s' in %s — skipped", validated["id"], json_file)

    logger.info("Loaded %d knowledge documents from %s", len(documents), root)
    return documents


def get_knowledge_stats(directory: Path | None = None) -> dict:
    """Return summary stats about the knowledge base files."""
    docs = load_from_directory(directory)
    by_tech: dict[str, int] = {}
    by_topic: dict[str, int] = {}
    by_domain: dict[str, int] = {}
    by_check: dict[str, int] = {}
    missing_validation_checks: list[str] = []

    for doc in docs:
        meta = doc["metadata"]
        by_tech[meta["technology_type"]] = by_tech.get(meta["technology_type"], 0) + 1
        by_topic[meta["topic"]] = by_topic.get(meta["topic"], 0) + 1
        domain = meta.get("domain", "general")
        by_domain[domain] = by_domain.get(domain, 0) + 1

        checks = [c for c in meta.get("validation_checks", "").split(",") if c]
        if checks:
            for c in checks:
                by_check[c] = by_check.get(c, 0) + 1
        else:
            missing_validation_checks.append(doc["id"])

    root = directory or _knowledge_root()
    json_files = [f for f in root.rglob("*.json") if not f.name.startswith("_")]

    return {
        "total_documents": len(docs),
        "source_files": len(json_files),
        "by_technology_type": by_tech,
        "by_topic": by_topic,
        "by_domain": by_domain,
        "by_validation_check": by_check,
        "docs_missing_validation_checks": missing_validation_checks,
        "knowledge_dir": str(root.resolve()),
    }


def load_sample_knowledge() -> list[dict]:
    """Backward-compatible entry point used by main.py."""
    return load_from_directory()
