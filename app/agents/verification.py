"""
Agent 7: Context Verification Agent
=====================================

Responsibility
--------------
This is the anti-hallucination gate. Before the Reasoning Agent ever
sees a question, this agent decides: is there enough good evidence
to answer at all, and is that evidence internally consistent?

Design notes
------------
- Deliberately rubric-based rather than "ask the LLM how confident
  it is". Self-reported LLM confidence is a well-known unreliable
  signal - models are frequently confidently wrong. Instead we use
  concrete, measurable checks against the retrieved chunks:

    1. Enough evidence? -> at least `min_context_chunks` chunks
       retrieved, AND the top chunk's fused score clears
       `min_relevance_score`.
    2. Conflicting sources? -> a lightweight heuristic: if the top
       chunks come from different source documents AND contain
       polarity-flipping terms relative to each other (e.g. one says
       "required" and another says "not required" / "deprecated"),
       flag a possible conflict for the Reasoning Agent to surface
       rather than silently picking one side.
    3. Confidence -> derived directly from the top chunk's score and
       how many chunks support it, not from an LLM's self-assessment.

- The threshold values are intentionally conservative defaults
  (configurable via settings) since a false "sufficient evidence"
  verdict is far more costly here (a hallucinated or wrong answer
  presented as fact) than a false "insufficient evidence" verdict
  (a legitimate question gets a slightly-too-cautious "I don't know
  in the enterprise knowledge").
"""

from __future__ import annotations

import re

from app.config import settings
from app.agents.retrieval import _anchor_tokens, _chunk_has_anchors
from app.utils.logger import get_logger
from app.utils.schemas import RetrievedChunk, VerificationResult

logger = get_logger("agents.verification")

# Simple polarity-flip cue pairs used for the conflict heuristic.
# Not exhaustive by design - this is a cheap first pass, not a full
# contradiction-detection model. Extend as real conflicting SOPs are
# found during use.
_NEGATION_CUES = [
    ("required", "not required"),
    ("required", "optional"),
    ("mandatory", "optional"),
    ("deprecated", "recommended"),
    ("must", "should not"),
    ("enabled", "disabled"),
]


def _contains_conflicting_terms(text_a: str, text_b: str) -> bool:
    a, b = text_a.lower(), text_b.lower()
    for positive, negative in _NEGATION_CUES:
        if (positive in a and negative in b) or (negative in a and positive in b):
            return True
    return False


def _saturating_bm25(raw_score: float | None, saturation_point: float = 2.0) -> float:
    """
    Map an unbounded BM25 score onto a 0-1 scale using a saturating
    curve (score / (score + k)). BM25 scores have no fixed upper
    bound (they grow with term rarity and corpus size), so a simple
    linear cap is fragile across corpora - this saturates smoothly
    instead: a raw score equal to `saturation_point` maps to 0.5,
    and larger scores asymptotically approach 1.0.
    """
    if not raw_score or raw_score <= 0:
        return 0.0
    return raw_score / (raw_score + saturation_point)


def _absolute_relevance(chunk: RetrievedChunk) -> float:
    """
    The Verification Agent's anti-hallucination gate needs to know
    whether retrieved content is ACTUALLY relevant to the query in
    an absolute sense - not just "the best of whatever was
    returned". RRF's fused `score` is rank-based and will always
    give the top result a near-maximal score even when nothing in
    the corpus is relevant (e.g. an off-topic question against a
    narrow knowledge base). So this uses the raw, method-specific
    signals instead: cosine similarity from vector search (already
    a meaningful 0-1 relevance measure) or a saturated BM25 score
    (meaningful keyword-overlap strength), taking whichever is
    higher since either a strong semantic match OR a strong keyword
    match is legitimate evidence.
    """
    vector_component = chunk.vector_similarity or 0.0
    bm25_component = _saturating_bm25(chunk.bm25_raw_score)
    return max(vector_component, bm25_component)


class VerificationAgent:
    def __init__(
        self,
        min_context_chunks: int | None = None,
        min_relevance_score: float | None = None,
    ):
        self.min_context_chunks = min_context_chunks or settings.min_context_chunks
        self.min_relevance_score = min_relevance_score or settings.min_relevance_score

    def verify(self, retrieved: list[RetrievedChunk], question: str | None = None) -> VerificationResult:
        if not retrieved:
            return VerificationResult(
                sufficient_evidence=False,
                has_conflicts=False,
                confidence=0.0,
                reason="No chunks retrieved for this question.",
            )

        if question:
            required = _anchor_tokens(question)
            evidence = " ".join(r.chunk.text for r in retrieved)
            if required and not _chunk_has_anchors(evidence, required):
                reason = (
                    f"Retrieved chunks do not mention required topic terms {required}; "
                    "refusing to answer from a related-but-different document."
                )
                logger.info("Verification: sufficient=False (%s)", reason)
                return VerificationResult(
                    sufficient_evidence=False,
                    has_conflicts=False,
                    confidence=0.0,
                    reason=reason,
                )

        top_relevance = _absolute_relevance(retrieved[0])
        num_chunks = len(retrieved)

        sufficient = num_chunks >= self.min_context_chunks and top_relevance >= self.min_relevance_score

        # Check top few chunks pairwise for conflicting-term signals,
        # but only across DIFFERENT source documents - two chunks
        # from the same SOP saying different things about different
        # steps isn't a conflict, it's just two different steps.
        has_conflicts = False
        top_n = retrieved[:4]
        for i in range(len(top_n)):
            for j in range(i + 1, len(top_n)):
                if top_n[i].chunk.source_id == top_n[j].chunk.source_id:
                    continue
                if _contains_conflicting_terms(top_n[i].chunk.text, top_n[j].chunk.text):
                    has_conflicts = True
                    break
            if has_conflicts:
                break

        # Confidence: weighted combination of top-chunk relevance and
        # how many chunks corroborate it (more corroboration = higher
        # confidence, capped so a single very-high-scoring chunk still
        # isn't automatically maximal confidence).
        corroboration_bonus = min(num_chunks / (self.min_context_chunks * 2), 1.0) * 0.2
        confidence = min(top_relevance * 0.8 + corroboration_bonus, 1.0)

        if not sufficient:
            reason = (
                f"Only {num_chunks} chunk(s) retrieved (need >= {self.min_context_chunks}) "
                f"or top relevance score {top_relevance:.3f} below threshold {self.min_relevance_score}."
            )
        elif has_conflicts:
            reason = "Sufficient evidence found, but sources appear to conflict."
        else:
            reason = f"Sufficient, consistent evidence from {num_chunks} chunk(s)."

        result = VerificationResult(
            sufficient_evidence=sufficient,
            has_conflicts=has_conflicts,
            confidence=round(confidence, 3),
            reason=reason,
        )
        logger.info(
            f"Verification: sufficient={sufficient} conflicts={has_conflicts} "
            f"confidence={result.confidence} ({reason})"
        )
        return result
