"""HTTP routes for RebootX tech-refresh assessments."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, Response

from app.auth import TokenUser, get_current_user, require_admin
from app.rebootx.config import settings
from app.rebootx.engine import (
    assessment_service,
    bridge_service,
    capture_service,
    knowledge_service,
    ollama_service,
    seed_compatibility_knowledge,
)
from app.rebootx.knowledge_loader import get_knowledge_stats
from app.rebootx.schemas import (
    CaptureRequest,
    KnowledgeStatsResponse,
    LLMStatusResponse,
    ScanAndAssessRequest,
    SourceType,
    UpgradeAssessment,
    UpgradeRequest,
)
from app.rebootx.services.capture_service import CaptureError
from app.rebootx.services.report_service import build_html_report, build_pdf_report, report_filenames
from app.utils.logger import get_logger

logger = get_logger("rebootx.api")

router = APIRouter(prefix="/rebootx", tags=["RebootX"])


def _resolve_project_path(location: str) -> Path:
    raw = Path(location).expanduser()
    if str(raw) in {".", ""}:
        return settings.scan_root.resolve()
    resolved = raw.resolve() if raw.is_absolute() else (settings.scan_root / raw).resolve()
    try:
        resolved.relative_to(settings.scan_root.resolve())
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Local scan/capture is limited to this project directory",
        ) from exc
    if not resolved.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {resolved}")
    return resolved


@router.get("/status")
async def rebootx_status(user: Annotated[TokenUser, Depends(get_current_user)]):
    llm = await ollama_service.status()
    return {
        "status": "ok",
        "requested_by": user.email,
        "knowledge_documents": knowledge_service.document_count,
        "knowledge_dir": settings.knowledge_dir,
        "llm": llm.to_dict(),
        "analysis_mode": "ai" if llm.available else "rules_fallback",
    }


@router.get("/llm/status", response_model=LLMStatusResponse)
async def llm_status(user: Annotated[TokenUser, Depends(get_current_user)]):
    return LLMStatusResponse(**(await ollama_service.status()).to_dict())


@router.post("/assess", response_model=UpgradeAssessment)
async def assess_upgrade(
    request: UpgradeRequest,
    user: Annotated[TokenUser, Depends(get_current_user)],
):
    try:
        result = await assessment_service.assess(request)
    except Exception as exc:
        logger.exception("Assessment failed for %s", user.email)
        raise HTTPException(status_code=500, detail=f"Assessment failed: {exc}") from exc
    logger.info(
        "RebootX assess by %s: %s %s→%s risk=%s mode=%s",
        user.email,
        request.technology_type.value,
        request.current_version,
        request.target_version,
        result.overall_risk.value,
        result.analysis_mode,
    )
    return result


@router.post("/capture")
async def capture_upgrade(
    request: CaptureRequest,
    user: Annotated[TokenUser, Depends(get_current_user)],
):
    payload = request.model_copy()
    if payload.source_type == SourceType.LOCAL:
        payload.location = str(_resolve_project_path(payload.location))
    try:
        captured = capture_service.capture(payload)
    except CaptureError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Capture failed")
        raise HTTPException(status_code=500, detail=f"Capture failed: {exc}") from exc
    logger.info("RebootX capture by %s from %s", user.email, payload.location)
    return captured


@router.post("/capture-and-assess", response_model=UpgradeAssessment)
async def capture_and_assess(
    request: CaptureRequest,
    user: Annotated[TokenUser, Depends(get_current_user)],
):
    payload = request.model_copy()
    if payload.source_type == SourceType.LOCAL:
        payload.location = str(_resolve_project_path(payload.location))
    try:
        captured = capture_service.capture(payload)
    except CaptureError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    upgrade = UpgradeRequest(
        technology_type=captured.technology_type,
        current_version=captured.current_version,
        target_version=captured.target_version,
        dependencies=captured.dependencies,
        integrations=captured.integrations,
        environment=captured.environment,
        notes=(
            f"Auto-captured from {captured.source_type.value}: {captured.location}. "
            f"Detected from: {', '.join(captured.detected_from)}."
        ),
    )
    return await assessment_service.assess(upgrade)


@router.post("/scan-and-assess")
async def scan_and_assess(
    request: ScanAndAssessRequest,
    user: Annotated[TokenUser, Depends(get_current_user)],
):
    repo = _resolve_project_path(request.repo_path)
    try:
        scan_dict, upgrade_request = bridge_service.scan_and_build_request(
            repo_path=str(repo),
            target_version=request.target_version,
            current_version=request.current_version,
            environment=request.environment or "production",
        )
        assessment = await assessment_service.assess(upgrade_request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Scan-and-assess failed")
        raise HTTPException(status_code=500, detail=f"Scan-and-assess failed: {exc}") from exc
    logger.info("RebootX scan-and-assess by %s path=%s", user.email, repo)
    return {
        "scan_result": scan_dict,
        "upgrade_request": upgrade_request.model_dump(),
        "assessment": assessment.model_dump(),
    }


@router.post("/report")
async def generate_report(
    assessment: UpgradeAssessment,
    user: Annotated[TokenUser, Depends(get_current_user)],
    format: str = Query(default="html", pattern="^(html|pdf)$"),
):
    payload = assessment.model_dump(mode="json")
    names = report_filenames(payload)
    if format == "pdf":
        data = build_pdf_report(payload)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{names["pdf"]}"'},
        )
    html = build_html_report(payload)
    return HTMLResponse(
        content=html,
        headers={"Content-Disposition": f'attachment; filename="{names["html"]}"'},
    )


@router.get("/knowledge/stats", response_model=KnowledgeStatsResponse)
async def knowledge_stats(user: Annotated[TokenUser, Depends(get_current_user)]):
    stats = get_knowledge_stats()
    return KnowledgeStatsResponse(
        total_documents=stats["total_documents"],
        chroma_documents=knowledge_service.document_count,
        source_files=stats["source_files"],
        by_technology_type=stats["by_technology_type"],
        by_topic=stats["by_topic"],
        knowledge_dir=stats["knowledge_dir"],
    )


@router.post("/knowledge/reload")
async def reload_knowledge(user: Annotated[TokenUser, Depends(require_admin)]):
    count = seed_compatibility_knowledge()
    stats = get_knowledge_stats()
    return {"status": "ok", "documents_loaded": count, "stats": stats, "by": user.email}
