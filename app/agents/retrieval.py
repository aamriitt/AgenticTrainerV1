"""
Agent 6: Retrieval Agent (Hybrid Search)
=========================================

Responsibility
--------------
Given a user question, retrieve the top-K most relevant chunks by
combining dense vector search (semantic similarity, via ChromaDB)
with sparse keyword search (BM25). Pure vector search often misses
exact-term matches (product codes, error codes, acronyms like "MOQ")
that BM25 catches easily; pure BM25 misses paraphrases and synonyms
that vector search catches. Combining both is standard practice for
production RAG and is what "hybrid search" refers to here.

Design notes
------------
- Fusion method: reciprocal rank fusion (RRF) rather than a naive
  weighted sum of raw scores. RRF combines RANKS, not raw scores,
  which sidesteps the problem that BM25 scores and cosine-similarity
  scores live on completely different, non-comparable scales -
  naively weighting them (e.g. 0.5*bm25_score + 0.5*vector_score)
  is a common mistake because whichever method happens to produce
  larger numbers silently dominates the fusion.
- `settings.hybrid_alpha` still expresses "how much to favor vector
  vs keyword search", but it's applied as an RRF weight (multiplying
  each method's reciprocal-rank contribution) rather than a blend of
  raw scores.
- The BM25 index is rebuilt from whatever's currently in ChromaDB.
  For a corpus that changes fairly infrequently (SME-gated updates,
  not live streaming ingestion), rebuilding on each retrieval call
  is simpler and fast enough; if the corpus grows very large this is
  the first place to add caching/incremental updates.
"""

from __future__ import annotations

from app.agents.embeddings import EmbeddingAgent
from app.config import settings
from app.database.chroma import ChromaStore
from app.utils.logger import get_logger
from app.utils.schemas import Chunk, RetrievedChunk

logger = get_logger("agents.retrieval")

_RRF_K = 60  # standard RRF smoothing constant


import re

# Minimal English stopword list. Filtering these out before BM25
# scoring matters more than it might seem: without it, two
# completely unrelated questions that happen to share common
# function words ("What is the capital of France?" vs "What is
# MOQ?") can produce a deceptively non-zero BM25 score purely from
# "what"/"is" overlap, which would wrongly look like keyword
# evidence to the Verification Agent.
_STOPWORDS = frozenset(
    """a an the is are was were be been being do does did doing
    of to in on at for with by from as it its this that these those
    what which who whom how when where why can could should would
    will shall may might must i you he she we they them his her their
    our your and or but if then so not no nor""".split()
)

# Generic query words that must NOT satisfy the topic check by themselves.
# "document loader methods in langgraph" would otherwise match LangChain notes
# because those pages contain "document" / "loader" / "methods".
_COMMON_QUERY_WORDS = frozenset(
    """different various several available following listed mentioned
    document documents loader loaders method methods type types
    comparison compare explain explanation describe description
    using based according provided context process system service
    application example examples used work works working handle
    handling create creating answer question component components
    content source sources data file files page pages
    """.split()
)


def _tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


def _required_tokens(query: str) -> list[str]:
    """Product/topic tokens the evidence must actually contain.

    Length >= 6 and not a generic English query word. That makes
    `langgraph` required while `document` / `loader` / `methods` are not.
    """
    return [t for t in _tokenize(query) if len(t) >= 6 and t not in _COMMON_QUERY_WORDS]


def _text_has_all_required(text: str, required: list[str]) -> bool:
    if not required:
        return True
    haystack = text.lower()
    return all(token in haystack for token in required)


# Back-compat aliases used by VerificationAgent
def _anchor_tokens(query: str) -> list[str]:
    return _required_tokens(query)


def _chunk_has_anchors(text: str, anchors: list[str]) -> bool:
    return _text_has_all_required(text, anchors)


class RetrievalAgent:
    def __init__(self, store: ChromaStore, embedding_agent: EmbeddingAgent):
        self.store = store
        self.embedding_agent = embedding_agent
        self._bm25 = None
        self._bm25_chunks: list[Chunk] = []

    def _build_bm25_index(self) -> None:
        from rank_bm25 import BM25Okapi

        self._bm25_chunks = self.store.get_all_for_bm25()
        if not self._bm25_chunks:
            self._bm25 = None
            return
        tokenized_corpus = [_tokenize(c.text) for c in self._bm25_chunks]
        self._bm25 = BM25Okapi(tokenized_corpus)

    def _bm25_search(self, query: str, top_k: int) -> list[RetrievedChunk]:
        if self._bm25 is None:
            self._build_bm25_index()
        if self._bm25 is None:
            return []

        scores = self._bm25.get_scores(_tokenize(query))
        ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        return [
            RetrievedChunk(
                chunk=self._bm25_chunks[i],
                score=float(scores[i]),
                retrieval_method="bm25",
                bm25_raw_score=float(scores[i]),
            )
            for i in ranked_indices
            if scores[i] > 0
        ]

    def _vector_search(self, query: str, top_k: int) -> list[RetrievedChunk]:
        query_embedding = self.embedding_agent.embed_query(query)
        return self.store.query(query_embedding, top_k=top_k)

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        hybrid_alpha: float | None = None,
        source_type_filter: str | None = None,
    ) -> list[RetrievedChunk]:
        """
        Run hybrid retrieval and return the fused top-K results.

        `hybrid_alpha` in [0, 1]: 0 = keyword-only, 1 = vector-only,
        0.5 (default) = equal weight. Fusion is via reciprocal rank
        fusion (RRF), weighted by alpha.
        """
        top_k = top_k or settings.retrieval_top_k
        alpha = settings.hybrid_alpha if hybrid_alpha is None else hybrid_alpha

        # Retrieve a slightly larger candidate pool from each method
        # before fusing, so the fused top-K isn't starved by either
        # method's own top-K cutoff.
        candidate_k = max(top_k * 3, 10)

        where = {"source_type": source_type_filter} if source_type_filter else None
        vector_results = self._vector_search(query, candidate_k) if alpha > 0 else []
        bm25_results = self._bm25_search(query, candidate_k) if alpha < 1 else []

        if where:
            vector_results = [r for r in vector_results if r.chunk.source_type.value == source_type_filter]
            bm25_results = [r for r in bm25_results if r.chunk.source_type.value == source_type_filter]

        fused = self._reciprocal_rank_fusion(vector_results, bm25_results, alpha)
        required = _required_tokens(query)
        if required:
            on_topic = [r for r in fused if _text_has_all_required(r.chunk.text, required)]
            if on_topic:
                fused = on_topic
            else:
                logger.info(
                    "Retrieval: no chunk contains required topic terms %s; refusing related-document hits",
                    required,
                )
                return []
        return fused[:top_k]

    @staticmethod
    def _reciprocal_rank_fusion(
        vector_results: list[RetrievedChunk],
        bm25_results: list[RetrievedChunk],
        alpha: float,
    ) -> list[RetrievedChunk]:
        rrf_scores: dict[str, float] = {}
        chunk_lookup: dict[str, Chunk] = {}
        vector_sim_lookup: dict[str, float] = {}
        bm25_score_lookup: dict[str, float] = {}

        for rank, result in enumerate(vector_results):
            chunk_id = result.chunk.chunk_id
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + alpha * (1.0 / (_RRF_K + rank + 1))
            chunk_lookup[chunk_id] = result.chunk
            vector_sim_lookup[chunk_id] = result.vector_similarity

        for rank, result in enumerate(bm25_results):
            chunk_id = result.chunk.chunk_id
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + (1 - alpha) * (1.0 / (_RRF_K + rank + 1))
            chunk_lookup[chunk_id] = result.chunk
            bm25_score_lookup[chunk_id] = result.bm25_raw_score

        # Raw RRF scores live in a tiny, fusion-method-specific range
        # (roughly 0 to 1/(RRF_K+1), i.e. ~0.016 max). Normalize by the
        # theoretical maximum (a chunk ranked #1 by BOTH methods) so
        # `score` is comparable across different alpha/method mixes -
        # but note this `score` is for ORDERING results, not for
        # judging absolute relevance (see vector_similarity/
        # bm25_raw_score below, which the Verification Agent uses
        # instead for that purpose).
        max_possible = 1.0 / (_RRF_K + 1)
        ranked_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)

        return [
            RetrievedChunk(
                chunk=chunk_lookup[cid],
                score=round(min(rrf_scores[cid] / max_possible, 1.0), 4),
                retrieval_method="hybrid",
                vector_similarity=vector_sim_lookup.get(cid),
                bm25_raw_score=bm25_score_lookup.get(cid),
            )
            for cid in ranked_ids
        ]
