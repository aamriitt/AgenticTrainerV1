"""
Shared dataclasses/pydantic models passed between agents.

Keeping these in one module means every agent speaks the same
"shape" of data, which is what actually makes a multi-agent pipeline
composable instead of a pile of ad-hoc dicts.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    FAQ = "faq"
    VIDEO = "video"


class RawDocument(BaseModel):
    """Output of the Ingestion Agent: plain text plus provenance metadata."""

    source_id: str = Field(..., description="Stable identifier, e.g. filename without extension")
    source_type: SourceType
    file_path: str
    text: str
    # Page-level or timestamp-level breakdown, used later for citations.
    # For PDFs: {"1": "text on page 1", "2": "..."}
    # For video: {"00:00:00-00:00:30": "transcript segment", ...}
    segments: dict[str, str] = Field(default_factory=dict)
    extra_metadata: dict = Field(default_factory=dict)


class Chunk(BaseModel):
    """A single semantically-chunked, cleaned piece of text ready for embedding."""

    chunk_id: str
    source_id: str
    source_type: SourceType
    text: str
    # Human-readable citation locator, e.g. "Page 15, Section 3.2" or "00:14:32"
    citation_locator: Optional[str] = None
    extra_metadata: dict = Field(default_factory=dict)


class IntentLabel(str, Enum):
    PROCEDURE = "procedure"
    EXPLANATION = "explanation"
    COMPARISON = "comparison"
    DEFINITION = "definition"
    TROUBLESHOOTING = "troubleshooting"
    FAQ = "faq"
    UNKNOWN = "unknown"


class RetrievedChunk(BaseModel):
    chunk: Chunk
    score: float
    retrieval_method: str  # "vector", "bm25", or "hybrid"
    # Raw, method-specific signals kept alongside the (possibly
    # rank-fused) `score` above. RRF's fused score is great for
    # ORDERING results but is relative to whatever candidates were
    # returned - it does NOT reflect whether anything retrieved is
    # actually relevant to the query. The Verification Agent needs
    # an absolute signal for that, hence these are preserved through
    # fusion rather than discarded.
    vector_similarity: Optional[float] = None  # raw cosine similarity, 0-1
    bm25_raw_score: Optional[float] = None  # unbounded BM25 score


class VerificationResult(BaseModel):
    sufficient_evidence: bool
    has_conflicts: bool
    confidence: float
    reason: str


class Citation(BaseModel):
    source_id: str
    source_type: SourceType
    locator: str  # "Page 15, Section 3.2" or "00:14:32" or "FAQ #12"


class AnswerResult(BaseModel):
    question: str
    intent: IntentLabel
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    refused: bool = False
    confidence: float = 0.0
