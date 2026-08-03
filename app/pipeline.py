"""
Pipeline: wires every agent together using LangGraph.

There are two distinct pipelines here, matching the two halves of
the architecture diagram:

1. INGESTION PIPELINE (`AgenticTrainerPipeline.ingest_and_index`)
   File -> Ingestion -> Cleaning -> Chunking -> Embedding -> ChromaDB
   This is a simple linear pipeline (no branching/LLM decisions), so
   it's implemented as a plain function rather than a LangGraph graph
   - LangGraph earns its keep where there's real branching logic,
   which is the query side below.

2. QUERY PIPELINE (`AgenticTrainerPipeline.build_query_graph`)
   Question -> Intent -> Retrieval -> Verification -> [Reasoning OR
   Refusal] -> Citation -> Answer
   This DOES have a real branching decision (the Verification gate),
   so it's implemented as a LangGraph StateGraph. This is also the
   piece most worth demoing/explaining in a portfolio context, since
   it's what makes the system refuse to hallucinate.

Design notes
------------
- `AgenticTrainerPipeline` is a single composition root: it
  constructs (or accepts injected) instances of every agent once,
  and both pipelines share them. This avoids e.g. reloading the
  embedding model or rebuilding the BM25 index on every single call.
- The query graph's state (`QueryState`) is a TypedDict rather than
  a Pydantic model because LangGraph's StateGraph expects a plain
  mapping it can merge partial updates into between nodes.
"""

from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.agents.chunking import chunk_document
from app.agents.citation import build_citations
from app.agents.cleaning import clean_document
from app.agents.embeddings import EmbeddingAgent
from app.agents.feedback import FeedbackAgent
from app.agents.ingestion import ingest_file
from app.agents.intent import IntentAgent
from app.agents.reasoning import ReasoningAgent
from app.agents.retrieval import RetrievalAgent
from app.agents.validation import ValidationAgent
from app.agents.verification import VerificationAgent
from app.config import settings
from app.database.chroma import ChromaStore
from app.database.sqlite import FeedbackStore
from app.utils.logger import get_logger
from app.utils.schemas import AnswerResult, Citation, IntentLabel, RetrievedChunk, VerificationResult

logger = get_logger("pipeline")

_REFUSAL_MESSAGE = "I couldn't find this in the enterprise knowledge."


class QueryState(TypedDict, total=False):
    question: str
    intent: IntentLabel
    retrieved_chunks: list[RetrievedChunk]
    verification: VerificationResult
    answer: str
    citations: list[Citation]
    refused: bool


class AgenticTrainerPipeline:
    """
    Composition root: builds every agent once and exposes the two
    top-level operations the rest of the app needs - indexing a new
    document, and answering a question.
    """

    def __init__(
        self,
        embedding_agent: EmbeddingAgent | None = None,
        chroma_store: ChromaStore | None = None,
        feedback_store: FeedbackStore | None = None,
        intent_agent: IntentAgent | None = None,
        reasoning_agent: ReasoningAgent | None = None,
    ):
        self.embedding_agent = embedding_agent or EmbeddingAgent()
        self.chroma_store = chroma_store or ChromaStore()
        self.feedback_store = feedback_store or FeedbackStore()

        self.intent_agent = intent_agent or IntentAgent()
        self.retrieval_agent = RetrievalAgent(store=self.chroma_store, embedding_agent=self.embedding_agent)
        self.verification_agent = VerificationAgent()
        self.reasoning_agent = reasoning_agent or ReasoningAgent()
        self.feedback_agent = FeedbackAgent(store=self.feedback_store)
        self.validation_agent = ValidationAgent(
            feedback_store=self.feedback_store,
            chroma_store=self.chroma_store,
            embedding_agent=self.embedding_agent,
        )

        self._graph = self._build_query_graph()

    # ------------------------------------------------------------------
    # Ingestion pipeline (linear: no branching needed)
    # ------------------------------------------------------------------

    def ingest_and_index(self, file_path: str, whisper_model_size: str | None = None) -> int:
        """
        Full ingestion pipeline for one file: ingest -> clean -> chunk
        -> embed -> store. Returns the number of chunks indexed.

        If the file was previously indexed (same source_id), old
        chunks are deleted first so re-ingesting a corrected document
        doesn't leave stale/duplicate chunks behind.
        """
        raw_doc = ingest_file(file_path, whisper_model_size=whisper_model_size or settings.whisper_model_size)
        cleaned_doc = clean_document(raw_doc)
        chunks = chunk_document(cleaned_doc)

        if not chunks:
            logger.warning(f"No chunks produced for '{file_path}'; nothing indexed.")
            return 0

        self.chroma_store.delete_by_source_id(raw_doc.source_id)

        embeddings = self.embedding_agent.embed_chunks(chunks)
        self.chroma_store.upsert_chunks(chunks, embeddings)

        # BM25 index is built lazily from Chroma; invalidate the cached
        # one in RetrievalAgent so the next query picks up new content.
        self.retrieval_agent._bm25 = None

        logger.info(f"Indexed '{file_path}': {len(chunks)} chunks")
        return len(chunks)

    # ------------------------------------------------------------------
    # Query pipeline (LangGraph StateGraph: has a real branching decision)
    # ------------------------------------------------------------------

    def _node_classify_intent(self, state: QueryState) -> QueryState:
        intent = self.intent_agent.classify(state["question"])
        return {"intent": intent}

    def _node_retrieve(self, state: QueryState) -> QueryState:
        retrieved = self.retrieval_agent.retrieve(state["question"])
        return {"retrieved_chunks": retrieved}

    def _node_verify(self, state: QueryState) -> QueryState:
        verification = self.verification_agent.verify(state["retrieved_chunks"])
        return {"verification": verification}

    def _node_reason(self, state: QueryState) -> QueryState:
        answer = self.reasoning_agent.generate_answer(
            question=state["question"],
            intent=state["intent"],
            retrieved_chunks=state["retrieved_chunks"],
            verification=state["verification"],
        )
        return {"answer": answer, "refused": False}

    def _node_refuse(self, state: QueryState) -> QueryState:
        return {"answer": _REFUSAL_MESSAGE, "refused": True}

    def _node_cite(self, state: QueryState) -> QueryState:
        if state.get("refused"):
            return {"citations": []}
        citations = build_citations(state["retrieved_chunks"])
        return {"citations": citations}

    def _route_after_verification(self, state: QueryState) -> str:
        return "reason" if state["verification"].sufficient_evidence else "refuse"

    def _build_query_graph(self):
        graph = StateGraph(QueryState)

        graph.add_node("classify_intent", self._node_classify_intent)
        graph.add_node("retrieve", self._node_retrieve)
        graph.add_node("verify", self._node_verify)
        graph.add_node("reason", self._node_reason)
        graph.add_node("refuse", self._node_refuse)
        graph.add_node("cite", self._node_cite)

        graph.set_entry_point("classify_intent")
        graph.add_edge("classify_intent", "retrieve")
        graph.add_edge("retrieve", "verify")
        graph.add_conditional_edges(
            "verify",
            self._route_after_verification,
            {"reason": "reason", "refuse": "refuse"},
        )
        graph.add_edge("reason", "cite")
        graph.add_edge("refuse", "cite")
        graph.add_edge("cite", END)

        return graph.compile()

    def ask(self, question: str, log_feedback: bool = True) -> AnswerResult:
        """Run the full query graph for a question and return the final AnswerResult."""
        final_state: QueryState = self._graph.invoke({"question": question})

        result = AnswerResult(
            question=question,
            intent=final_state["intent"],
            answer=final_state["answer"],
            citations=final_state["citations"],
            refused=final_state.get("refused", False),
            confidence=final_state["verification"].confidence,
        )

        feedback_id = None
        if log_feedback:
            feedback_id = self.feedback_agent.log_answer(result)

        return result, feedback_id
