"""
ChromaDB wrapper (PersistentClient, no Docker required).

Responsibility
--------------
Own all direct interaction with ChromaDB so the rest of the codebase
works with `Chunk` objects and never touches Chroma's raw API
directly. This keeps a future vector-DB swap (e.g. to Qdrant or
pgvector) confined to this one file.

Design notes
------------
- One collection ("enterprise_knowledge") for the whole corpus, with
  source_type/source_id/citation_locator stored as metadata so we can
  filter (e.g. "only search SOPs") and reconstruct citations from
  query results without a second lookup.
- `upsert_chunks` uses Chroma's upsert (not add) so re-ingesting an
  updated document, or re-embedding an SME-approved correction,
  overwrites the old vector for that chunk_id instead of duplicating.
"""

from __future__ import annotations

from app.config import settings
from app.utils.logger import get_logger
from app.utils.schemas import Chunk, RetrievedChunk, SourceType

logger = get_logger("database.chroma")

COLLECTION_NAME = "enterprise_knowledge"


class ChromaStore:
    def __init__(self, persist_dir: str | None = None):
        import chromadb

        self.persist_dir = persist_dir or str(settings.chroma_dir)
        self._client = chromadb.PersistentClient(path=self.persist_dir)
        self._collection = self._client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            f"ChromaStore ready at '{self.persist_dir}' "
            f"({self._collection.count()} vectors currently stored)"
        )

    def upsert_chunks(self, chunks: list[Chunk], embeddings: list[list[float]]) -> None:
        if not chunks:
            return
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"Mismatched lengths: {len(chunks)} chunks vs {len(embeddings)} embeddings"
            )

        self._collection.upsert(
            ids=[c.chunk_id for c in chunks],
            embeddings=embeddings,
            documents=[c.text for c in chunks],
            metadatas=[
                {
                    "source_id": c.source_id,
                    "source_type": c.source_type.value,
                    "citation_locator": c.citation_locator or "",
                    **{k: str(v) for k, v in c.extra_metadata.items()},
                }
                for c in chunks
            ],
        )
        logger.info(f"Upserted {len(chunks)} chunks into '{COLLECTION_NAME}'")

    def delete_by_source_id(self, source_id: str) -> None:
        """Remove all chunks belonging to a given source document (for re-ingestion)."""
        self._collection.delete(where={"source_id": source_id})
        logger.info(f"Deleted existing chunks for source_id='{source_id}'")

    def query(
        self,
        query_embedding: list[float],
        top_k: int | None = None,
        where: dict | None = None,
    ) -> list[RetrievedChunk]:
        """Vector similarity search. Returns results sorted by relevance."""
        top_k = top_k or settings.retrieval_top_k

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
        )

        return self._parse_results(results)

    def get_all_for_bm25(self) -> list[Chunk]:
        """
        Fetch every stored chunk as Chunk objects, for building/refreshing
        the BM25 keyword index used in hybrid retrieval (Agent 6).
        """
        raw = self._collection.get(include=["documents", "metadatas"])
        chunks = []
        for chunk_id, text, meta in zip(raw["ids"], raw["documents"], raw["metadatas"]):
            chunks.append(
                Chunk(
                    chunk_id=chunk_id,
                    source_id=meta.get("source_id", ""),
                    source_type=SourceType(meta.get("source_type", "txt")),
                    text=text,
                    citation_locator=meta.get("citation_locator") or None,
                    extra_metadata={
                        k: v
                        for k, v in meta.items()
                        if k not in {"source_id", "source_type", "citation_locator"}
                    },
                )
            )
        return chunks

    def count(self) -> int:
        return self._collection.count()

    @staticmethod
    def _parse_results(results: dict) -> list[RetrievedChunk]:
        retrieved: list[RetrievedChunk] = []

        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for chunk_id, text, meta, distance in zip(ids, documents, metadatas, distances):
            # Chroma returns cosine *distance*; convert to a similarity
            # score in [0, 1] where higher = more relevant.
            similarity = 1 - distance

            chunk = Chunk(
                chunk_id=chunk_id,
                source_id=meta.get("source_id", ""),
                source_type=SourceType(meta.get("source_type", "txt")),
                text=text,
                citation_locator=meta.get("citation_locator") or None,
                extra_metadata={
                    k: v
                    for k, v in meta.items()
                    if k not in {"source_id", "source_type", "citation_locator"}
                },
            )
            retrieved.append(
                RetrievedChunk(
                    chunk=chunk,
                    score=round(similarity, 4),
                    retrieval_method="vector",
                    vector_similarity=round(similarity, 4),
                )
            )

        return retrieved
