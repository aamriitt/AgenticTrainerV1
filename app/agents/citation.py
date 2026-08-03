"""
Agent 9: Citation Agent
=======================

Responsibility
--------------
Turn the retrieved chunks that supported an answer into precise,
professional citations - "Manufacturing SOP.pdf, Page 15, Section
3.2" or "Training Video, 00:14:32" - instead of a bare "Source: PDF".

Design notes
------------
- Citations are built purely from chunk metadata already carried
  through the whole pipeline (source_id, source_type,
  citation_locator) - no extra LLM call needed, which keeps this
  fast, free, and 100% accurate (no risk of a model inventing or
  garbling a citation).
- Deduplicates citations: if multiple retrieved chunks came from the
  same source_id + locator (can happen if hybrid fusion pulls in
  near-duplicate chunks), only one citation entry is produced.
- Provides both a structured list (`Citation` objects, for API
  responses / UI rendering) and a formatted display string (for
  quick display in the Streamlit UI or logs).
"""

from __future__ import annotations

from app.utils.logger import get_logger
from app.utils.schemas import Citation, RetrievedChunk, SourceType

logger = get_logger("agents.citation")

_SOURCE_TYPE_LABELS = {
    SourceType.PDF: "PDF",
    SourceType.DOCX: "Document",
    SourceType.TXT: "Document",
    SourceType.FAQ: "FAQ",
    SourceType.VIDEO: "Training Video",
}


def build_citations(retrieved_chunks: list[RetrievedChunk]) -> list[Citation]:
    """Build a deduplicated, ordered list of citations from retrieved chunks."""
    seen: set[tuple[str, str]] = set()
    citations: list[Citation] = []

    for r in retrieved_chunks:
        chunk = r.chunk
        locator = chunk.citation_locator or "Unknown location"
        key = (chunk.source_id, locator)
        if key in seen:
            continue
        seen.add(key)
        citations.append(
            Citation(source_id=chunk.source_id, source_type=chunk.source_type, locator=locator)
        )

    return citations


def format_citation(citation: Citation, file_extension_hint: str | None = None) -> str:
    """
    Render a single citation as a professional display string, e.g.:
      "Manufacturing SOP.pdf - Page 15"
      "Training Video - 00:14:32"
      "general_faq - FAQ #2: Difference between Depot and Plant?"
    """
    label = _SOURCE_TYPE_LABELS.get(citation.source_type, "Document")
    display_name = citation.source_id

    if citation.source_type == SourceType.VIDEO:
        return f"{label} ({display_name}) - {citation.locator}"

    ext = file_extension_hint or {
        SourceType.PDF: ".pdf",
        SourceType.DOCX: ".docx",
        SourceType.TXT: ".txt",
        SourceType.FAQ: ".txt",
    }.get(citation.source_type, "")

    return f"{display_name}{ext} - {citation.locator}"


def format_citations_block(citations: list[Citation]) -> str:
    """Render a full list of citations as a numbered display block for the UI/API."""
    if not citations:
        return ""
    lines = [f"{i}. {format_citation(c)}" for i, c in enumerate(citations, start=1)]
    return "\n".join(lines)
