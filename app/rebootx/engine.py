"""RebootX composition root: one knowledge store, LLM, assessment, scan bridge."""

from __future__ import annotations

from app.rebootx.knowledge_loader import load_from_directory
from app.rebootx.services.assessment_service import AssessmentService
from app.rebootx.services.bridge_service import BridgeService
from app.rebootx.services.capture_service import CaptureService
from app.rebootx.services.knowledge_service import KnowledgeService
from app.rebootx.services.ollama_service import OllamaService
from app.utils.logger import get_logger

logger = get_logger("rebootx")

knowledge_service = KnowledgeService()
ollama_service = OllamaService()
assessment_service = AssessmentService(knowledge_service, ollama_service)
capture_service = CaptureService()
bridge_service = BridgeService()


def seed_compatibility_knowledge() -> int:
    documents = load_from_directory()
    if not documents:
        logger.warning("No RebootX compatibility documents found to ingest")
        return 0
    count = knowledge_service.ingest_documents(documents)
    logger.info("RebootX knowledge ready: %s documents in compatibility_knowledge", count)
    return count
