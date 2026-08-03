# 04 Knowledge Base and RAG

## 1. Overview
The knowledge base is the foundation of the Agentic Trainer. It transforms unstructured data (videos, PDFs, text) into structured, searchable embeddings. This document defines the ingestion pipeline, metadata schema, and retrieval strategies for the Retrieval-Augmented Generation (RAG) system.

## 2. Ingestion Pipeline
The ingestion pipeline is responsible for parsing uploaded files and converting them into embeddings.

### 2.1 Video Ingestion (Whisper)
- **Process:** Extract audio track from video files (.mp4, .mov).
- **Transcription:** Run audio through OpenAI Whisper (hosted locally or via API).
- **Output:** A JSON transcript containing text segments mapped to exact video timestamps (e.g., `[00:01:23 - 00:01:30] "Go to the billing portal..."`).

### 2.2 Text and PDF Ingestion
- **Process:** Use OCR (for scanned PDFs) or text extractors (like PyMuPDF) to pull raw text.
- **Cleaning:** Remove headers, footers, page numbers, and redundant boilerplate text.

## 3. Chunking Strategy
To ensure the LLM receives highly relevant context without exceeding its token limit, ingested text is split into chunks.
- **Method:** Semantic chunking or Recursive Character Text Splitting.
- **Chunk Size:** 500-1000 tokens.
- **Overlap:** 10-20% overlap between adjacent chunks to preserve context across boundaries.

## 4. Metadata Schema
Every chunk stored in ChromaDB must include rich metadata to enable precise filtering and citation.
```json
{
  "source_id": "doc_12345",
  "filename": "Deployment_Runbook_v2.pdf",
  "document_type": "PDF",
  "author": "DevOps Team",
  "upload_date": "2024-03-15T10:00:00Z",
  "version": "2.0",
  "chunk_index": 4,
  "timestamp_start": null,
  "timestamp_end": null,
  "status": "active"
}
```

## 5. Vector Store (ChromaDB)
- **Embeddings Model:** To be determined (e.g., `all-MiniLM-L6-v2` or a specific OpenAI/Cohere model).
- **Indexing:** Chunks are vectorized and inserted into a ChromaDB collection specific to the tenant or project.

## 6. Retrieval Strategy (Hybrid Search)
To maximize accuracy, the Retrieval Agent uses Hybrid Search:
1. **Semantic Search:** Finds chunks with high conceptual similarity to the user's query using vector distance (cosine similarity).
2. **Keyword Search (BM25):** Finds exact matches for specific acronyms, error codes, or names that embeddings might miss.
3. **Re-ranking:** A cross-encoder model scores the combined results and returns the Top-K chunks (usually K=3 to 5) to the Reasoning Agent.

## 7. Versioning and Freshness
- **Conflict Resolution:** If multiple documents contain conflicting answers (e.g., "Runbook v1" vs "Runbook v2"), the Reasoning Agent is instructed via prompt to prioritize the chunk with the most recent `upload_date` or highest `version` number.
- **Obsolescence:** Administrators can mark a `source_id` as inactive, which immediately removes its chunks from search results without requiring a full database rebuild.
