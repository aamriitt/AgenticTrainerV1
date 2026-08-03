"""
Agent 4: Embedding Generation Agent
====================================

Responsibility
--------------
Turn cleaned, chunked text into dense vector embeddings for storage
in ChromaDB.

Design notes
------------
- Model is loaded lazily (on first use) and cached, since loading a
  sentence-transformers model is expensive (~1-2s+ and a chunk of
  memory) and we don't want every import of this module to pay that
  cost.
- Default model is BAAI/bge-base-en-v1.5 per the architecture spec.
  BGE models recommend prefixing *queries* (not documents) with an
  instruction string for retrieval tasks - this measurably improves
  retrieval quality, so `embed_query` and `embed_documents` are
  separate methods rather than one generic `embed`.
- `EmbeddingAgent` accepts an injectable `model` so tests (and this
  sandbox, where HuggingFace is unreachable) can substitute a
  lightweight deterministic stub without changing any calling code.
"""

from __future__ import annotations

from typing import Protocol

from app.config import settings
from app.utils.logger import get_logger
from app.utils.schemas import Chunk

logger = get_logger("agents.embeddings")

# BGE models want this instruction prefix on queries (not documents)
# for asymmetric retrieval - see the model card on HuggingFace.
_BGE_QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "


class EmbeddingModel(Protocol):
    """Minimal interface any embedding backend must satisfy."""

    def encode(self, texts: list[str]) -> list[list[float]]: ...


class SentenceTransformerModel:
    """Real backend: loads a HuggingFace sentence-transformers model."""

    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer

        logger.info(f"Loading embedding model '{model_name}' (first run downloads weights)...")
        self._model = SentenceTransformer(model_name)

    def encode(self, texts: list[str]) -> list[list[float]]:
        vectors = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return vectors.tolist()


class EmbeddingAgent:
    """
    Wraps an embedding backend and exposes retrieval-appropriate
    methods for documents (chunks going INTO the store) vs. queries
    (user questions going OUT to search the store).
    """

    def __init__(self, model: EmbeddingModel | None = None, model_name: str | None = None):
        self.model_name = model_name or settings.embedding_model
        self._model = model  # allows injection for tests; lazy-loaded otherwise
        self._is_bge = "bge" in self.model_name.lower()

    @property
    def model(self) -> EmbeddingModel:
        if self._model is None:
            self._model = SentenceTransformerModel(self.model_name)
        return self._model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed chunk text for storage. No instruction prefix needed."""
        if not texts:
            return []
        return self.model.encode(texts)

    def embed_query(self, query: str) -> list[float]:
        """Embed a user question for search. Applies BGE's recommended prefix."""
        text = f"{_BGE_QUERY_INSTRUCTION}{query}" if self._is_bge else query
        return self.model.encode([text])[0]

    def embed_chunks(self, chunks: list[Chunk]) -> list[list[float]]:
        """Convenience wrapper: embed a list of Chunk objects directly."""
        return self.embed_documents([c.text for c in chunks])
