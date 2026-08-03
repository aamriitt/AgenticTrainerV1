"""
Agent 10: Feedback Agent
========================

Responsibility
--------------
Thin orchestration layer over FeedbackStore (SQLite) that the API/UI
calls after showing an answer to the user. Every answer gets logged;
if the user rates it thumbs-down, this agent also prompts for (and
stores) what should be corrected.

Design notes
------------
- Kept intentionally thin - almost all the actual logic is in
  `FeedbackStore`. This module exists so agent-level concerns (e.g.
  what to log, when to prompt for a correction) are separate from
  raw SQL/storage concerns, matching the rest of the pipeline where
  each Agentic step is its own module even when the underlying
  logic is simple.
"""

from __future__ import annotations

from app.database.sqlite import FeedbackStore
from app.utils.logger import get_logger
from app.utils.schemas import AnswerResult

logger = get_logger("agents.feedback")


class FeedbackAgent:
    def __init__(self, store: FeedbackStore | None = None):
        self.store = store or FeedbackStore()

    def log_answer(self, answer_result: AnswerResult) -> int:
        """Call this right after an answer is shown to the user, before any rating exists."""
        citations_str = "; ".join(
            f"{c.source_id} ({c.locator})" for c in answer_result.citations
        )
        feedback_id = self.store.log_interaction(
            question=answer_result.question,
            answer=answer_result.answer,
            intent=answer_result.intent.value,
            citations=citations_str,
        )
        logger.info(f"Logged interaction #{feedback_id} for question: '{answer_result.question[:60]}'")
        return feedback_id

    def submit_thumbs_up(self, feedback_id: int) -> None:
        self.store.submit_rating(feedback_id, rating="up")

    def submit_thumbs_down(self, feedback_id: int, correction: str) -> None:
        """
        `correction` should capture what the user says SHOULD have
        been said/done instead - this is the "What should be
        corrected?" prompt from the architecture spec. Moves the
        item into the SME review queue (Agent 11).
        """
        self.store.submit_rating(feedback_id, rating="down", correction=correction)
