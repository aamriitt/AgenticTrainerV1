"""
Agent 11: Validation Agent
===========================

Responsibility
--------------
Powers the admin/SME review panel: list pending thumbs-down
corrections, let an SME approve or reject each one, and - this is
the step that actually closes the human-in-the-loop learning cycle -
re-embed approved corrections into the knowledge base so future
questions benefit from the fix.

Design notes
------------
- Only APPROVED corrections are ever re-embedded. A raw thumbs-down
  and correction text is just a claim from one user; requiring SME
  sign-off before it affects retrieval for everyone else is what
  prevents a single bad-faith or mistaken "correction" from
  poisoning the knowledge base. This mirrors the architecture
  doc's "Approved? YES -> Knowledge Base Updated" gate exactly.
- An approved correction is embedded as a new chunk with
  `source_type=FAQ` and `source_id="sme_correction_{feedback_id}"`,
  so it's clearly distinguishable in the store from original
  ingested documents (useful for audits: "which answers came from
  an SME correction vs. the original SOP?").
- The chunk text combines the original question and the correction,
  formatted like an FAQ pair, so it retrieves well against future
  similarly-phrased questions.
"""

from __future__ import annotations

from app.agents.embeddings import EmbeddingAgent
from app.database.chroma import ChromaStore
from app.database.sqlite import FeedbackStore
from app.utils.logger import get_logger
from app.utils.schemas import Chunk, SourceType

logger = get_logger("agents.validation")


class ValidationAgent:
    def __init__(
        self,
        feedback_store: FeedbackStore | None = None,
        chroma_store: ChromaStore | None = None,
        embedding_agent: EmbeddingAgent | None = None,
    ):
        self.feedback_store = feedback_store or FeedbackStore()
        self.chroma_store = chroma_store  # lazily required only when processing
        self.embedding_agent = embedding_agent

    def list_pending(self) -> list[dict]:
        return self.feedback_store.get_pending_reviews()

    def approve(self, feedback_id: int, sme_comments: str = "", reviewed_by: str = "sme") -> None:
        self.feedback_store.review_feedback(
            feedback_id, approved=True, sme_comments=sme_comments, reviewed_by=reviewed_by
        )

    def reject(self, feedback_id: int, sme_comments: str = "", reviewed_by: str = "sme") -> None:
        self.feedback_store.review_feedback(
            feedback_id, approved=False, sme_comments=sme_comments, reviewed_by=reviewed_by
        )

    def process_approved_corrections(self) -> int:
        """
        Re-embed every approved-but-not-yet-processed correction into
        the vector store. Returns the number of corrections processed.

        Requires `chroma_store` and `embedding_agent` to have been
        provided at construction time (not needed for list/approve/
        reject, which only touch SQLite - kept optional so the admin
        panel can use this agent for review actions without needing
        a live embedding model loaded).
        """
        if self.chroma_store is None or self.embedding_agent is None:
            raise RuntimeError(
                "process_approved_corrections requires chroma_store and embedding_agent "
                "to be provided at construction time."
            )

        approved = self.feedback_store.get_approved_unprocessed()
        if not approved:
            logger.info("No approved corrections awaiting re-embedding.")
            return 0

        chunks: list[Chunk] = []
        for item in approved:
            correction_text = f"Q: {item['question']}\nA: {item['correction']}"
            chunks.append(
                Chunk(
                    chunk_id=f"sme_correction_{item['id']}::1",
                    source_id=f"sme_correction_{item['id']}",
                    source_type=SourceType.FAQ,
                    text=correction_text,
                    citation_locator=f"SME-approved correction #{item['id']}",
                    extra_metadata={"reviewed_by": item.get("reviewed_by") or "unknown"},
                )
            )

        embeddings = self.embedding_agent.embed_chunks(chunks)
        self.chroma_store.upsert_chunks(chunks, embeddings)

        for item in approved:
            self.feedback_store.mark_processed(item["id"])

        logger.info(f"Re-embedded {len(chunks)} SME-approved correction(s) into the knowledge base.")
        return len(chunks)
