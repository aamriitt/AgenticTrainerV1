# 08 API Specification

## 1. Overview
The FastAPI backend exposes a RESTful API for both the user-facing chat application and the administrative interfaces for managing the knowledge base.

## 2. Base URL
All endpoints are relative to: `http://localhost:8000/api/v1`

## 3. Endpoints

### 3.1 Chat Interaction

**`POST /chat`**
- **Description:** Submit a query to the Agentic Trainer.
- **Request Body:**
  ```json
  {
    "user_id": "string",
    "session_id": "string",
    "query": "string"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "answer": "string (Markdown format)",
    "citations": [
      {
        "source_id": "string",
        "title": "string",
        "link": "url"
      }
    ],
    "intent_detected": "string"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing fields.
  - `503 Service Unavailable`: LLM Inference server down.

### 3.2 Knowledge Management

**`POST /upload`**
- **Description:** Upload a video, PDF, or text file for ingestion.
- **Request (Multipart Form Data):**
  - `file`: The file payload (max 500MB).
  - `author`: "string"
  - `document_type`: "video | pdf | doc"
- **Response (202 Accepted):**
  ```json
  {
    "job_id": "uuid",
    "status": "processing_started",
    "message": "File uploaded and sent to background worker for transcription/embedding."
  }
  ```

**`GET /sources`**
- **Description:** Retrieve a list of all active documents in the knowledge base.
- **Query Parameters:** `?limit=50&offset=0&status=active`
- **Response (200 OK):**
  ```json
  {
    "total": 12,
    "sources": [
      {
        "source_id": "doc_123",
        "filename": "Deployment_v2.pdf",
        "upload_date": "2024-03-15T10:00:00Z",
        "status": "active"
      }
    ]
  }
  ```

### 3.3 Feedback System

**`POST /feedback`**
- **Description:** Submit explicit feedback for a generated answer.
- **Request Body:**
  ```json
  {
    "session_id": "string",
    "rating": -1,  // 1 for thumbs up, -1 for thumbs down
    "correction_text": "string (optional)",
    "source_id_flagged": "string (optional)"
  }
  ```
- **Response (200 OK):** `{"status": "feedback_logged"}`

### 3.4 Diagnostics and Health

**`GET /health`**
- **Description:** Check the health of all downstream services (ChromaDB, Ollama, Celery).
- **Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "services": {
      "chromadb": "up",
      "ollama": "up",
      "redis": "up"
    }
  }
  ```

**`POST /admin/reindex`**
- **Description:** Force a full reindex of the ChromaDB collections (Admin only).
- **Response (202 Accepted):** `{"job_id": "uuid", "status": "reindex_started"}`
