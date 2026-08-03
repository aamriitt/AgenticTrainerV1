"""
Agent 5: Intent Classification Agent
=====================================

Responsibility
--------------
Classify an incoming question into one of: procedure, explanation,
comparison, definition, troubleshooting, faq. Downstream agents use
this to select a better-tailored prompt (e.g. a "procedure" question
should get a numbered-steps answer; a "comparison" question should
get a structured side-by-side answer).

Design notes
------------
- Two-tier design: a fast, free, rule-based classifier runs first
  based on question patterns (starts with "how do I", "difference
  between", "what is", etc). If it's confident, we skip the LLM call
  entirely - this matters because intent classification runs on
  EVERY query, so avoiding an LLM round-trip for the common,
  obvious cases keeps latency and cost down.
- If the rule-based pass is not confident, we fall back to an LLM
  call (Gemma3 via Ollama) for the ambiguous remainder. This also
  means the system works correctly even before Ollama is set up
  locally - it just relies more heavily on the rule-based pass,
  defaulting to UNKNOWN (handled as a generic explanation prompt)
  when no LLM is available.
"""

from __future__ import annotations

import re

from app.services.llm_client import LLMClient, OllamaClient
from app.utils.logger import get_logger
from app.utils.schemas import IntentLabel

logger = get_logger("agents.intent")

_INTENT_SYSTEM_PROMPT = """You are a strict classifier. Classify the user's question into
exactly one of these labels: procedure, explanation, comparison, definition,
troubleshooting, faq.

Respond with ONLY the label, lowercase, nothing else."""

# Ordered rule patterns: (compiled regex, label). Order matters -
# more specific patterns are checked first.
_RULES: list[tuple[re.Pattern, IntentLabel]] = [
    (re.compile(r"\b(difference between|compare|vs\.?|versus)\b", re.I), IntentLabel.COMPARISON),
    (re.compile(r"^\s*what is\b|^\s*define\b|\bmeaning of\b", re.I), IntentLabel.DEFINITION),
    (
        re.compile(
            r"\b(error|fail|failed|failing|not working|issue|problem|troubleshoot|stuck|broken)\b",
            re.I,
        ),
        IntentLabel.TROUBLESHOOTING,
    ),
    (
        re.compile(r"^\s*how (do|can|to|should) i\b|\bsteps? (to|for)\b|\bprocedure for\b", re.I),
        IntentLabel.PROCEDURE,
    ),
    (re.compile(r"^\s*why\b|^\s*explain\b|\bhow does\b", re.I), IntentLabel.EXPLANATION),
]


def classify_by_rules(question: str) -> IntentLabel | None:
    """Fast pattern-based classification. Returns None if no rule matches."""
    for pattern, label in _RULES:
        if pattern.search(question):
            return label
    return None


class IntentAgent:
    def __init__(self, llm_client: LLMClient | None = None, use_llm_fallback: bool = True):
        self.use_llm_fallback = use_llm_fallback
        self._llm_client = llm_client

    @property
    def llm_client(self) -> LLMClient:
        if self._llm_client is None:
            self._llm_client = OllamaClient()
        return self._llm_client

    def classify(self, question: str) -> IntentLabel:
        rule_result = classify_by_rules(question)
        if rule_result is not None:
            logger.info(f"Intent (rule-based): '{question[:60]}' -> {rule_result.value}")
            return rule_result

        if not self.use_llm_fallback:
            logger.info(f"Intent (no rule match, LLM fallback disabled): -> {IntentLabel.UNKNOWN.value}")
            return IntentLabel.UNKNOWN

        try:
            raw = self.llm_client.generate(_INTENT_SYSTEM_PROMPT, question, temperature=0.0)
            label_text = raw.strip().lower().split()[0].strip(".,!?")
            label = IntentLabel(label_text)
            logger.info(f"Intent (LLM): '{question[:60]}' -> {label.value}")
            return label
        except (ValueError, IndexError):
            logger.warning(f"LLM returned unparseable intent label: '{raw!r}'. Defaulting to UNKNOWN.")
            return IntentLabel.UNKNOWN
        except Exception as e:
            logger.warning(f"LLM intent classification failed ({e}). Defaulting to UNKNOWN.")
            return IntentLabel.UNKNOWN
