"""
FastAPI application.

HTTP surface over `AgenticTrainerPipeline` for the Atlas React UI
(and Streamlit). Includes JWT auth, CORS, and RBAC on admin routes.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth import (
    LoginRequest,
    LoginResponse,
    TokenUser,
    authenticate,
    create_access_token,
    get_current_user,
    require_admin,
)
from app.config import settings
from app.knowledge_bridge import ingest_rebootx_into_atlas
from app.pipeline import AgenticTrainerPipeline
from app.rebootx.engine import knowledge_service as rebootx_knowledge, seed_compatibility_knowledge
from app.rebootx.router import router as rebootx_router
from app.utils.logger import get_logger

logger = get_logger("api")

app = FastAPI(
    title="Agentic Trainer API",
    description="Enterprise knowledge assistant plus RebootX tech-refresh assessments.",
    version="1.1.0",
)

_cors_origins = settings.cors_origins
_cors_allow_credentials = "*" not in _cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not _cors_allow_credentials else _cors_origins,
    allow_credentials=_cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline = AgenticTrainerPipeline()
seed_compatibility_knowledge()
if settings.sync_rebootx_kb_on_start:
    ingest_rebootx_into_atlas(pipeline)

app.include_router(rebootx_router)

_EXT_TO_SUBDIR = {
    ".pdf": "pdf",
    ".docx": "sop",
    ".txt": "faq",
    ".md": "faq",
    ".mp4": "videos",
    ".mov": "videos",
    ".mkv": "videos",
    ".wav": "videos",
    ".mp3": "videos",
}

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._\- ]+")


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


def _safe_filename(name: str) -> str:
    base = Path(name).name
    cleaned = _SAFE_NAME.sub("_", base).strip(" ._")
    if not cleaned:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return cleaned[:180]


# --- Auth ---

@app.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = authenticate(request.email, request.password)
    token = create_access_token(user)
    return LoginResponse(
        access_token=token,
        user=TokenUser(email=user["email"], name=user["name"], role=user["role"]),
    )


@app.get("/auth/me", response_model=TokenUser)
async def me(user: Annotated[TokenUser, Depends(get_current_user)]):
    return user


# --- Knowledge ---

@app.get("/sources")
async def list_sources(user: Annotated[TokenUser, Depends(get_current_user)]):
    """List on-disk knowledge files with basic metadata."""
    items = []
    for path in sorted(settings.knowledge_dir.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(settings.knowledge_dir)
        items.append(
            {
                "id": str(rel).replace("\\", "/"),
                "title": path.name,
                "path": str(rel).replace("\\", "/"),
                "type": path.suffix.lower().lstrip(".") or "file",
                "size_bytes": path.stat().st_size,
                "updated_at": path.stat().st_mtime,
            }
        )
    return {"items": items, "count": len(items), "vectors_stored": pipeline.chroma_store.count()}


@app.post("/upload", response_model=UploadResponse)
async def upload_file(
    user: Annotated[TokenUser, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    safe_name = _safe_filename(file.filename)
    ext = Path(safe_name).suffix.lower()
    subdir = _EXT_TO_SUBDIR.get(ext)
    if subdir is None:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    # 50 MB upload cap
    max_bytes = 50 * 1024 * 1024
    dest_dir = settings.knowledge_dir / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / safe_name

    size = 0
    with open(dest_path, "wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                f.close()
                dest_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File exceeds 50 MB limit")
            f.write(chunk)

    try:
        num_chunks = pipeline.ingest_and_index(str(dest_path))
    except Exception as e:
        logger.error(f"Failed to index uploaded file '{safe_name}' by {user.email}: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}") from e

    logger.info(f"Upload indexed by {user.email}: {safe_name} ({num_chunks} chunks)")
    return UploadResponse(filename=safe_name, chunks_indexed=num_chunks)


@app.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    user: Annotated[TokenUser, Depends(get_current_user)],
):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    result, feedback_id = pipeline.ask(request.question)

    from app.agents.citation import format_citation

    logger.info(f"Ask by {user.email}: refused={result.refused} intent={result.intent.value}")
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
async def feedback_up(
    feedback_id: int,
    user: Annotated[TokenUser, Depends(get_current_user)],
):
    pipeline.feedback_agent.submit_thumbs_up(feedback_id)
    return {"status": "ok", "by": user.email}


@app.post("/feedback/{feedback_id}/down")
async def feedback_down(
    feedback_id: int,
    request: ThumbsDownRequest,
    user: Annotated[TokenUser, Depends(get_current_user)],
):
    if not request.correction.strip():
        raise HTTPException(status_code=400, detail="A correction is required for thumbs-down feedback.")
    pipeline.feedback_agent.submit_thumbs_down(feedback_id, correction=request.correction)
    return {"status": "ok", "queued_for_sme_review": True, "by": user.email}


@app.get("/admin/pending")
async def admin_pending(user: Annotated[TokenUser, Depends(require_admin)]):
    return pipeline.validation_agent.list_pending()


@app.post("/admin/{feedback_id}/approve")
async def admin_approve(
    feedback_id: int,
    request: ReviewRequest,
    user: Annotated[TokenUser, Depends(require_admin)],
):
    pipeline.validation_agent.approve(
        feedback_id,
        sme_comments=request.sme_comments,
        reviewed_by=request.reviewed_by or user.email,
    )
    return {"status": "approved"}


@app.post("/admin/{feedback_id}/reject")
async def admin_reject(
    feedback_id: int,
    request: ReviewRequest,
    user: Annotated[TokenUser, Depends(require_admin)],
):
    pipeline.validation_agent.reject(
        feedback_id,
        sme_comments=request.sme_comments,
        reviewed_by=request.reviewed_by or user.email,
    )
    return {"status": "rejected"}


@app.post("/admin/reindex")
async def admin_reindex(user: Annotated[TokenUser, Depends(require_admin)]):
    count = pipeline.validation_agent.process_approved_corrections()
    return {"corrections_reindexed": count, "by": user.email}


@app.get("/admin/analytics")
async def admin_analytics(user: Annotated[TokenUser, Depends(require_admin)]):
    summary = pipeline.feedback_store.get_analytics_summary()
    summary["vectors_stored"] = pipeline.chroma_store.count()
    return summary


@app.get("/interactions")
async def list_interactions(
    user: Annotated[TokenUser, Depends(get_current_user)],
    limit: int = 50,
):
    """Recent grounded Q&A interactions for history UI."""
    limit = max(1, min(limit, 200))
    rows = pipeline.feedback_store.list_recent_interactions(limit=limit)
    return {"items": rows, "count": len(rows), "requested_by": user.email}


@app.get("/")
async def root():
    return {
        "message": "Agentic Trainer API is running",
        "health": "/health",
        "docs": "/docs",
        "ui": settings.public_app_url,
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "vectors_stored": pipeline.chroma_store.count(),
        "ollama_host": settings.ollama_host,
        "ollama_model": settings.ollama_model,
        "rebootx_documents": rebootx_knowledge.document_count,
    }
