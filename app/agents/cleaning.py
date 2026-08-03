"""
Agent 2: Cleaning Agent
=======================

Responsibility
--------------
Take the raw text produced by the Ingestion Agent and strip out noise
that would otherwise pollute embeddings and confuse retrieval:

- filler words / verbal tics from transcripts ("um", "uh", "you know")
- speaker labels ("John:", "SPEAKER_1:")
- timestamps embedded in text (e.g. "[00:01:23]")
- duplicate/near-duplicate consecutive sentences (common in transcripts
  where a speaker repeats themselves)
- excess whitespace

Design notes
------------
- Cleaning operates on `RawDocument.segments` (not just the flat
  `.text`) so that citation locators (page numbers, timestamps)
  stay aligned with the cleaned content.
- Only transcript-style noise (filler words, speaker labels) is
  applied to VIDEO source types by default — we don't want to
  accidentally strip legitimate words like "Note:" from a PDF/DOCX
  just because it looks like a speaker label. This is configurable.
"""

from __future__ import annotations

import re

from app.utils.logger import get_logger
from app.utils.schemas import RawDocument, SourceType

logger = get_logger("agents.cleaning")

# --- Regex patterns ---

_TIMESTAMP_PATTERN = re.compile(r"\[?\d{1,2}:\d{2}(:\d{2})?\]?")
_SPEAKER_LABEL_PATTERN = re.compile(r"^\s*([A-Z][A-Za-z0-9_ ]{0,20}|SPEAKER[_ ]?\d+)\s*:\s*", re.MULTILINE)
_MULTI_WHITESPACE_PATTERN = re.compile(r"[ \t]+")
_MULTI_NEWLINE_PATTERN = re.compile(r"\n{3,}")

# Verbal filler words/phrases common in spoken transcripts.
# Word-boundary matched, case-insensitive.
_FILLER_PATTERNS = [
    re.compile(r"\b(um+|uh+|erm+)\b[,]?", re.IGNORECASE),
    re.compile(r"\byou know\b[,]?", re.IGNORECASE),
    re.compile(r"\bi mean\b[,]?", re.IGNORECASE),
    re.compile(r"\bkind of\b[,]?", re.IGNORECASE),
    re.compile(r"\bsort of\b[,]?", re.IGNORECASE),
    re.compile(r"\blike,\b", re.IGNORECASE),
    re.compile(r"\bso yeah\b[,]?", re.IGNORECASE),
    re.compile(r"\bbasically\b[,]?", re.IGNORECASE),
]


def remove_timestamps(text: str) -> str:
    return _TIMESTAMP_PATTERN.sub("", text)


def remove_speaker_labels(text: str) -> str:
    return _SPEAKER_LABEL_PATTERN.sub("", text)


def remove_filler_words(text: str) -> str:
    for pattern in _FILLER_PATTERNS:
        text = pattern.sub("", text)
    return text


def remove_duplicate_sentences(text: str) -> str:
    """
    Remove consecutive duplicate/near-duplicate sentences.
    Transcripts often contain a speaker repeating a phrase
    ("we need to- we need to submit the form") which adds no
    information but bloats chunks.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text)
    deduped: list[str] = []
    prev_normalized = None

    for sentence in sentences:
        normalized = re.sub(r"[^a-z0-9]", "", sentence.lower())
        if normalized and normalized == prev_normalized:
            continue
        deduped.append(sentence)
        prev_normalized = normalized if normalized else prev_normalized

    return " ".join(deduped)


def normalize_whitespace(text: str) -> str:
    text = _MULTI_WHITESPACE_PATTERN.sub(" ", text)
    text = _MULTI_NEWLINE_PATTERN.sub("\n\n", text)
    return text.strip()


def clean_text(text: str, is_transcript: bool = False) -> str:
    """
    Apply the full cleaning pipeline to a single string of text.

    `is_transcript` controls whether speaker-label and filler-word
    stripping are applied — these are only appropriate for spoken
    content (videos), not for structured documents like PDFs/DOCX
    where similar-looking patterns may be legitimate content.
    """
    if not text:
        return text

    if is_transcript:
        text = remove_timestamps(text)
        text = remove_speaker_labels(text)
        text = remove_filler_words(text)
        text = remove_duplicate_sentences(text)

    text = normalize_whitespace(text)
    return text


def clean_document(doc: RawDocument) -> RawDocument:
    """
    Clean every segment of a RawDocument in place (returns a new
    RawDocument instance) while preserving citation locators.
    """
    is_transcript = doc.source_type == SourceType.VIDEO

    cleaned_segments = {}
    for locator, segment_text in doc.segments.items():
        cleaned = clean_text(segment_text, is_transcript=is_transcript)
        if cleaned:
            cleaned_segments[locator] = cleaned

    cleaned_full_text = "\n\n".join(cleaned_segments.values())

    removed_chars = len(doc.text) - len(cleaned_full_text)
    logger.info(
        f"Cleaned '{doc.source_id}': {len(doc.segments)} -> {len(cleaned_segments)} segments, "
        f"~{max(removed_chars, 0)} chars removed"
    )

    return doc.model_copy(update={"segments": cleaned_segments, "text": cleaned_full_text})
