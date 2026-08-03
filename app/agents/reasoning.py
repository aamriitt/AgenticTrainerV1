"""
Agent 8: Reasoning Agent
========================

Responsibility
--------------
Take the user's question, its classified intent, the verified
retrieved context, and produce a final answer that is STRICTLY
grounded in that context. This agent never sees raw retrieval - it
only runs after the Verification Agent has approved proceeding.

Design notes
------------
- The system prompt is intent-aware: a "procedure" question gets a
  prompt nudging toward numbered steps, a "comparison" question gets
  a prompt nudging toward a structured side-by-side, etc. This is
  the payoff of having a separate Intent Agent instead of one
  generic prompt for everything.
- If the Verification Agent said evidence was insufficient, this
  agent is never called at all - the caller (the orchestrating
  pipeline / LangGraph graph) should short-circuit straight to the
  refusal message. That refusal path is handled in `pipeline.py`,
  not here, to keep this agent's only responsibility "generate a
  grounded answer from given context".
- If verification flagged a conflict, that fact IS passed in here,
  and the prompt explicitly instructs the model to surface the
  disagreement rather than silently pick a side.
- Requires a running local Ollama server with the configured model
  pulled (e.g. `ollama pull gemma3`). Not runnable in this sandbox -
  see llm_client.py notes. Test with `reasoning_agent.py`'s stub
  client injection for anything not requiring a real model.
"""

from __future__ import annotations

from app.services.llm_client import LLMClient, OllamaClient
from app.utils.logger import get_logger
from app.utils.schemas import IntentLabel, RetrievedChunk, VerificationResult

logger = get_logger("agents.reasoning")

_BASE_SYSTEM_PROMPT = """You are an SME (Subject Matter Expert) trainer for an enterprise \
knowledge assistant. You answer ONLY using the provided context below. \

Rules you must follow strictly:
- Never invent facts, steps, or numbers not present in the context.
- If the context does not contain the answer, say exactly: \
"I couldn't find this in the enterprise knowledge."
- Always write as if you are training a colleague: clear, direct, professional.
- Do not mention "the context" or "the provided text" in your answer - answer \
naturally as an expert would.
- Do not fabricate citations. Citations are added separately after your answer.
"""

_INTENT_STYLE_HINTS: dict[IntentLabel, str] = {
    IntentLabel.PROCEDURE: "Structure your answer as clear numbered steps.",
    IntentLabel.COMPARISON: "Structure your answer as a clear side-by-side comparison "
    "(e.g. bullet points contrasting each item on the same dimensions).",
    IntentLabel.DEFINITION: "Give a concise definition first, then 1-2 sentences of relevant detail.",
    IntentLabel.TROUBLESHOOTING: "Identify the likely cause first, then the resolution steps, "
    "based only on what the context supports.",
    IntentLabel.EXPLANATION: "Explain the concept clearly and logically, building from basics.",
    IntentLabel.FAQ: "Answer directly and concisely, the way an FAQ entry would.",
    IntentLabel.UNKNOWN: "Answer as clearly and directly as the context allows.",
}

_REFUSAL_MESSAGE = "I couldn't find this in the enterprise knowledge."


class ReasoningAgent:
    def __init__(self, llm_client: LLMClient | None = None):
        self._llm_client = llm_client

    @property
    def llm_client(self) -> LLMClient:
        if self._llm_client is None:
            self._llm_client = OllamaClient()
        return self._llm_client

    def generate_answer(
        self,
        question: str,
        intent: IntentLabel,
        retrieved_chunks: list[RetrievedChunk],
        verification: VerificationResult,
    ) -> str:
        """
        Generate a grounded answer. Callers should only invoke this
        when `verification.sufficient_evidence` is True - if it's
        False, return the refusal message directly without calling
        the LLM at all (see `REFUSAL_MESSAGE`).
        """
        if not verification.sufficient_evidence:
            logger.info("generate_answer called without sufficient evidence; returning refusal.")
            return _REFUSAL_MESSAGE

        context_block = self._build_context_block(retrieved_chunks)
        style_hint = _INTENT_STYLE_HINTS.get(intent, _INTENT_STYLE_HINTS[IntentLabel.UNKNOWN])

        conflict_note = ""
        if verification.has_conflicts:
            conflict_note = (
                "\n\nIMPORTANT: The retrieved sources appear to disagree with each other. "
                "Explicitly point out the disagreement and cite which source says what, "
                "rather than silently choosing one version."
            )

        system_prompt = f"{_BASE_SYSTEM_PROMPT}\n{style_hint}{conflict_note}"

        user_prompt = f"""Context:
{context_block}

Question: {question}

Answer using ONLY the context above."""

        try:
            answer = self.llm_client.generate(system_prompt, user_prompt, temperature=0.1)
        except Exception as e:
            logger.error(f"Reasoning agent LLM call failed: {e}")
            return (
                "I'm having trouble generating an answer right now due to a system issue. "
                "Please try again shortly."
            )

        if not answer.strip():
            return _REFUSAL_MESSAGE

        return answer.strip()

    @staticmethod
    def _build_context_block(retrieved_chunks: list[RetrievedChunk]) -> str:
        parts = []
        for i, r in enumerate(retrieved_chunks, start=1):
            locator = r.chunk.citation_locator or "Unknown location"
            parts.append(f"[Excerpt {i} - {r.chunk.source_id} ({locator})]\n{r.chunk.text}")
        return "\n\n".join(parts)
