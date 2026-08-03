"""
FastAPI application.

Responsibility
--------------
HTTP surface over `AgenticTrainerPipeline` and the feedback/validation
agents, for the Streamlit UI (and any other client) to call.

Endpoints
---------
POST /upload            - upload + index a knowledge file
POST /ask                - ask a question, get a grounded answer + citations
POST /feedback/{id}/up   - thumbs up an answer
POST /feedback/{id}/down - thumbs down + submit a correction
GET  /admin/pending      - list corrections awaiting SME review
POST /admin/{id}/approve - SME approves a correction
POST /admin/{id}/reject  - SME rejects a correction
POST /admin/reindex      - re-embed all approved-but-unprocessed corrections
GET  /admin/analytics    - basic usage/feedback counts

Design notes
------------
- The pipeline is constructed once at app startup (module-level
  singleton) rather than per-request, since it owns expensive
  resources (the embedding model, the BM25 index, DB connections).
- Uploaded files are saved under the correct `knowledge/<type>/`
  subfolder based on extension before being indexed, so re-running
  the app later picks up the same on-disk structure.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import settings
from app.pipeline import AgenticTrainerPipeline
from app.utils.logger import get_logger

logger = get_logger("api")

app = FastAPI(
    title="Agentic Trainer API",
    description="Enterprise knowledge assistant: ingestion, grounded Q&A, and SME-gated learning.",
    version="1.0.0",
)

pipeline = AgenticTrainerPipeline()

_EXT_TO_SUBDIR = {
    ".pdf": "pdf",
    ".docx": "sop",  # SOPs/manuals are typically DOCX; adjust per your org's convention
    ".txt": "faq",
    ".mp4": "videos",
    ".mov": "videos",
    ".mkv": "videos",
    ".wav": "videos",
    ".mp3": "videos",
}


# --- Request/response models ---

class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    question: str
    intent: str
    answer: str
    citations: list[str]
    refused: bool
    confidence: float
    feedback_id: Optional[int] = None


class ThumbsDownRequest(BaseModel):
    correction: str


class ReviewRequest(BaseModel):
    sme_comments: str = ""
    reviewed_by: str = "sme"


class UploadResponse(BaseModel):
    filename: str
    chunks_indexed: int


# --- Endpoints ---

@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    subdir = _EXT_TO_SUBDIR.get(ext)
    if subdir is None:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    dest_dir = settings.knowledge_dir / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / file.filename

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        num_chunks = pipeline.ingest_and_index(str(dest_path))
    except Exception as e:
        logger.error(f"Failed to index uploaded file '{file.filename}': {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}") from e

    return UploadResponse(filename=file.filename, chunks_indexed=num_chunks)


@app.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    result, feedback_id = pipeline.ask(request.question)

    from app.agents.citation import format_citation

    return AskResponse(
        question=result.question,
        intent=result.intent.value,
        answer=result.answer,
        citations=[format_citation(c) for c in result.citations],
        refused=result.refused,
        confidence=result.confidence,
        feedback_id=feedback_id,
    )


@app.post("/feedback/{feedback_id}/up")
async def feedback_up(feedback_id: int):
    pipeline.feedback_agent.submit_thumbs_up(feedback_id)
    return {"status": "ok"}


@app.post("/feedback/{feedback_id}/down")
async def feedback_down(feedback_id: int, request: ThumbsDownRequest):
    if not request.correction.strip():
        raise HTTPException(status_code=400, detail="A correction is required for thumbs-down feedback.")
    pipeline.feedback_agent.submit_thumbs_down(feedback_id, correction=request.correction)
    return {"status": "ok", "queued_for_sme_review": True}


@app.get("/admin/pending")
async def admin_pending():
    return pipeline.validation_agent.list_pending()


@app.post("/admin/{feedback_id}/approve")
async def admin_approve(feedback_id: int, request: ReviewRequest):
    pipeline.validation_agent.approve(
        feedback_id, sme_comments=request.sme_comments, reviewed_by=request.reviewed_by
    )
    return {"status": "approved"}


@app.post("/admin/{feedback_id}/reject")
async def admin_reject(feedback_id: int, request: ReviewRequest):
    pipeline.validation_agent.reject(
        feedback_id, sme_comments=request.sme_comments, reviewed_by=request.reviewed_by
    )
    return {"status": "rejected"}


@app.post("/admin/reindex")
async def admin_reindex():
    count = pipeline.validation_agent.process_approved_corrections()
    return {"corrections_reindexed": count}


@app.get("/admin/analytics")
async def admin_analytics():
    return pipeline.feedback_store.get_analytics_summary()


@app.get("/health")
async def health():
    return {"status": "ok", "vectors_stored": pipeline.chroma_store.count()}
