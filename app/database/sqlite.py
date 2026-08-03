"""
SQLite storage for feedback and SME validation workflow.

Responsibility
--------------
Own all direct SQL for two tables:

- `feedback`: every question/answer pair plus thumbs up/down and,
  for thumbs-down, the user's correction and SME's review comments.
- Interaction log entries reuse the same table with `feedback=None`
  until a person rates it, so this also doubles as the interaction
  log needed for analytics (top questions, unanswered queries).

Design notes
------------
- Plain `sqlite3` (stdlib) rather than an ORM - this is a small,
  well-defined schema and a full ORM would be overhead for two
  tables. If the schema grows significantly, revisit.
- `status` column drives the SME validation queue: 'pending' (new
  thumbs-down needing review), 'approved' (SME confirmed the
  correction, ready for re-embedding), 'rejected' (SME disagreed,
  no action taken). Thumbs-up feedback never needs review and is
  marked 'not_applicable'.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Optional

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("database.sqlite")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    intent TEXT,
    citations TEXT,
    rating TEXT,                 -- 'up', 'down', or NULL (no rating yet)
    correction TEXT,             -- user-provided correction text (thumbs-down only)
    sme_comments TEXT,
    status TEXT NOT NULL DEFAULT 'not_applicable',
                                  -- 'pending' | 'approved' | 'rejected' | 'not_applicable'
    reviewed_at TEXT,
    reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
"""


class FeedbackStore:
    def __init__(self, db_path: str | None = None):
        self.db_path = db_path or str(settings.feedback_db_path)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(_SCHEMA)
        logger.info(f"FeedbackStore ready at '{self.db_path}'")

    def log_interaction(
        self,
        question: str,
        answer: str,
        intent: str,
        citations: str = "",
    ) -> int:
        """Log every Q&A interaction (rating added later, if the user rates it)."""
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            cursor = conn.execute(
                """INSERT INTO feedback (created_at, question, answer, intent, citations, status)
                   VALUES (?, ?, ?, ?, ?, 'not_applicable')""",
                (now, question, answer, intent, citations),
            )
            return cursor.lastrowid

    def submit_rating(
        self,
        feedback_id: int,
        rating: str,
        correction: Optional[str] = None,
    ) -> None:
        """
        Attach a thumbs-up/down rating to a logged interaction.
        Thumbs-down entries move to 'pending' for SME review;
        thumbs-up entries stay 'not_applicable' (nothing to review).
        """
        if rating not in {"up", "down"}:
            raise ValueError("rating must be 'up' or 'down'")

        status = "pending" if rating == "down" else "not_applicable"

        with self._connect() as conn:
            conn.execute(
                """UPDATE feedback SET rating = ?, correction = ?, status = ?
                   WHERE id = ?""",
                (rating, correction, status, feedback_id),
            )
        logger.info(f"Feedback #{feedback_id} rated '{rating}' -> status='{status}'")

    def get_pending_reviews(self) -> list[dict]:
        """Fetch all thumbs-down feedback awaiting SME review (the Validation Agent queue)."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM feedback WHERE status = 'pending' ORDER BY created_at ASC"
            ).fetchall()
        return [dict(row) for row in rows]

    def review_feedback(
        self,
        feedback_id: int,
        approved: bool,
        sme_comments: Optional[str] = None,
        reviewed_by: Optional[str] = None,
    ) -> None:
        """
        SME approves or rejects a pending correction. Approved items
        are what the Validation Agent hands to the re-embedding step
        to actually update the knowledge base.
        """
        status = "approved" if approved else "rejected"
        now = datetime.now(timezone.utc).isoformat()

        with self._connect() as conn:
            conn.execute(
                """UPDATE feedback
                   SET status = ?, sme_comments = ?, reviewed_at = ?, reviewed_by = ?
                   WHERE id = ?""",
                (status, sme_comments, now, reviewed_by, feedback_id),
            )
        logger.info(f"Feedback #{feedback_id} reviewed by '{reviewed_by}': {status}")

    def get_approved_unprocessed(self) -> list[dict]:
        """
        Approved corrections not yet re-embedded. Once the Validation
        Agent re-embeds a correction, it should mark it processed via
        `mark_processed` so it isn't re-embedded again.
        """
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM feedback WHERE status = 'approved'"
            ).fetchall()
        return [dict(row) for row in rows]

    def mark_processed(self, feedback_id: int) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE feedback SET status = 'processed' WHERE id = ?", (feedback_id,)
            )
        logger.info(f"Feedback #{feedback_id} marked as processed (re-embedded)")

    def get_analytics_summary(self) -> dict:
        """Basic counts for an analytics dashboard: totals, ratings, pending reviews."""
        with self._connect() as conn:
            total = conn.execute("SELECT COUNT(*) AS c FROM feedback").fetchone()["c"]
            thumbs_up = conn.execute(
                "SELECT COUNT(*) AS c FROM feedback WHERE rating = 'up'"
            ).fetchone()["c"]
            thumbs_down = conn.execute(
                "SELECT COUNT(*) AS c FROM feedback WHERE rating = 'down'"
            ).fetchone()["c"]
            pending = conn.execute(
                "SELECT COUNT(*) AS c FROM feedback WHERE status = 'pending'"
            ).fetchone()["c"]

        return {
            "total_interactions": total,
            "thumbs_up": thumbs_up,
            "thumbs_down": thumbs_down,
            "pending_review": pending,
        }
