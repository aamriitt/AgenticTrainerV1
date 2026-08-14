"""ChromaDB-backed retrieval for compatibility knowledge."""

from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions

from app.rebootx.config import settings

KNOWLEDGE_COLLECTION = "compatibility_knowledge"


class KnowledgeService:
    def __init__(self) -> None:
        Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        self.collection = self.client.get_or_create_collection(
            name=KNOWLEDGE_COLLECTION,
            embedding_function=self.embedding_fn,
            metadata={"description": "RebootX compatibility and upgrade knowledge"},
        )

    @property
    def document_count(self) -> int:
        return self.collection.count()

    def reset_collection(self) -> None:
        """Clear all documents in place so the collection exactly matches KB files.

        Deletes documents by id rather than dropping the collection, so any
        running server keeps a valid handle to the same collection.
        """
        existing = self.collection.get()
        ids = existing.get("ids", [])
        if ids:
            self.collection.delete(ids=ids)

    def ingest_documents(self, documents: list[dict]) -> int:
        if not documents:
            return 0

        ids = [doc["id"] for doc in documents]
        texts = [doc["text"] for doc in documents]
        metadatas = [doc["metadata"] for doc in documents]

        self.collection.upsert(ids=ids, documents=texts, metadatas=metadatas)
        return len(documents)

    def retrieve(self, query: str, technology_type: str, n_results: int = 5) -> list[dict]:
        if self.collection.count() == 0:
            return []

        where_filter = {"technology_type": technology_type}
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=min(n_results, self.collection.count()),
                where=where_filter,
            )
        except Exception:
            results = self.collection.query(
                query_texts=[query],
                n_results=min(n_results, self.collection.count()),
            )

        documents: list[dict] = []
        for idx, doc in enumerate(results.get("documents", [[]])[0]):
            metadata = results.get("metadatas", [[]])[0][idx] or {}
            distance = results.get("distances", [[]])[0][idx]
            documents.append(
                {
                    "text": doc,
                    "metadata": metadata,
                    "relevance_score": round(max(0.0, 1.0 - float(distance)), 3),
                }
            )
        return documents
