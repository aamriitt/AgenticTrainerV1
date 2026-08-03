# 02 System Architecture

## 1. Overall Architecture
The Agentic Trainer system is designed around a modular, multi-agent architecture built to ingest, process, and query enterprise knowledge. The architecture separates the user-facing interface, the orchestration layer, the vector store, and the foundational language model to ensure scalability and maintainability.

## 2. Component Breakdown

### 2.1 Frontend
- **Purpose:** Provide a clean, intuitive web interface for users to chat with the system, and for administrators to upload and manage knowledge sources.
- **Technologies:** React / Next.js (or similar modern web framework).
- **Responsibilities:**
  - Render chat UI with citation links and inline document previews.
  - Provide an upload interface for videos, PDFs, and documents.
  - Display system feedback mechanisms (thumbs up/down, corrections).

### 2.2 FastAPI Backend
- **Purpose:** Serve as the central API gateway connecting the frontend to the agentic workflow and knowledge base.
- **Technologies:** Python, FastAPI.
- **Responsibilities:**
  - Expose RESTful endpoints for chat, uploads, and management.
  - Handle authentication and authorization.
  - Route incoming requests to the LangGraph Orchestrator.
  - Manage asynchronous tasks for file ingestion.

### 2.3 Orchestrator & Multi-Agent Framework
- **Purpose:** Manage the stateful workflow of a user's request, dynamically calling the appropriate specialized agents.
- **Technologies:** LangGraph, LangChain.
- **Responsibilities:**
  - Maintain conversation state and short-term memory.
  - Route queries to Intent, Retrieval, Reasoning, and Citation agents.
  - Handle cyclic workflows (e.g., asking for clarification if the Intent Agent is uncertain).
  - Enforce decision rules and confidence thresholds.

### 2.4 Language Model Integration (Gemma 3)
- **Purpose:** Provide the core reasoning, summarization, and generation capabilities for all agents.
- **Technologies:** Gemma 3 hosted locally via Ollama.
- **Responsibilities:**
  - Execute specific agent prompts (e.g., summarizing retrieved docs, extracting intents).
  - Generate human-readable responses based on grounded context.

### 2.5 Vector Database & RAG
- **Purpose:** Store and retrieve high-dimensional embeddings of all ingested enterprise knowledge.
- **Technologies:** ChromaDB.
- **Responsibilities:**
  - Store document chunks and their associated metadata (timestamps, source files, authors).
  - Perform semantic similarity searches using the chosen embedding model.
  - Support hybrid search (keyword + semantic) and metadata filtering.

### 2.6 Audio/Video Processing
- **Purpose:** Transcribe spoken knowledge from videos and meetings into text that can be embedded and searched.
- **Technologies:** OpenAI Whisper.
- **Responsibilities:**
  - Extract audio streams from uploaded video files.
  - Generate highly accurate text transcripts with timestamp annotations.
  - Pass transcripts to the text processing pipeline for chunking and embedding.

## 3. Deployment Architecture
- **Environment:** Containerized deployment using Docker.
- **Services:**
  1. `web-frontend`: The React UI.
  2. `api-server`: The FastAPI backend and LangGraph orchestrator.
  3. `chroma-db`: The vector store service.
  4. `ollama-service`: The local LLM inference server running Gemma 3.
  5. `worker-node`: Background Celery/Redis workers for processing heavy files (Whisper transcription, PDF OCR).
- **Scalability:** The API server and worker nodes can be scaled horizontally. The vector database and LLM inference server may require dedicated GPU resources depending on load.
