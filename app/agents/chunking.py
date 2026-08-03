"""
Agent 3: Semantic Chunking Agent
================================

Responsibility
--------------
Split cleaned text into overlapping chunks sized for embedding,
while keeping each chunk's citation locator intact (page/section/
timestamp) so the Citation Agent downstream can point back to an
exact location, not just "this document somewhere".

Design notes
------------
- We chunk PER SEGMENT, not on the flattened full-document text.
  If we chunked the flattened text, a chunk could silently span
  across a page boundary or a video-timestamp boundary, and we'd
  lose the ability to cite it precisely. Chunking segment-by-segment
  means every chunk maps to exactly one locator.
- Uses LangChain's RecursiveCharacterTextSplitter, which tries to
  split on paragraph breaks first, then sentences, then words —
  this approximates "semantic" boundaries far better than a naive
  fixed-character cut, without requiring an extra embedding-based
  clustering step (which is the fancier "semantic chunker" approach
  but adds latency+cost for marginal gain on structured SOP/manual
  content). If/when unstructured, free-flowing content becomes a
  large fraction of the corpus, swapping in a true semantic chunker
  (e.g. clustering by embedding similarity) is a drop-in change
  behind the same `chunk_document` interface.
- A segment shorter than `chunk_size` becomes exactly one chunk
  (no point splitting a short SOP step into fragments).
"""

from __future__ import annotations

from app.config import settings
from app.utils.logger import get_logger
from app.utils.schemas import Chunk, RawDocument

logger = get_logger("agents.chunking")


def _get_splitter(chunk_size: int, chunk_overlap: int):
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )


def chunk_document(
    doc: RawDocument,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Chunk]:
    """
    Chunk a cleaned RawDocument into a list of Chunk objects, one
    citation locator preserved per chunk (or "Chunk N of M" appended
    if a single segment itself had to be split further).
    """
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap
    splitter = _get_splitter(chunk_size, chunk_overlap)

    chunks: list[Chunk] = []
    chunk_counter = 0

    if not doc.segments:
        logger.warning(f"'{doc.source_id}' has no segments to chunk")
        return chunks

    for locator, segment_text in doc.segments.items():
        if not segment_text.strip():
            continue

        pieces = splitter.split_text(segment_text)

        for i, piece in enumerate(pieces):
            if not piece.strip():
                continue
            chunk_counter += 1
            # If a single segment (e.g. one long PDF page) had to be
            # split into multiple pieces, disambiguate the locator.
            citation_locator = locator if len(pieces) == 1 else f"{locator} (part {i + 1}/{len(pieces)})"

            chunks.append(
                Chunk(
                    chunk_id=f"{doc.source_id}::chunk_{chunk_counter:04d}",
                    source_id=doc.source_id,
                    source_type=doc.source_type,
                    text=piece.strip(),
                    citation_locator=citation_locator,
                    extra_metadata={**doc.extra_metadata, "file_path": doc.file_path},
                )
            )

    logger.info(
        f"Chunked '{doc.source_id}': {len(doc.segments)} segments -> {len(chunks)} chunks "
        f"(size={chunk_size}, overlap={chunk_overlap})"
    )
    return chunks
