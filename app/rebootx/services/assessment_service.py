"""Upgrade assessment orchestration (AI + rules fallback)."""

import logging
from typing import Iterable

from app.rebootx.schemas import (
    IdentifiedRisk,
    PriorityLevel,
    RiskLevel,
    UpgradeAssessment,
    UpgradeRequest,
    ValidationCheck,
)
from app.rebootx.services.integration_analyzer import analyze_integrations
from app.rebootx.services.knowledge_service import KnowledgeService
from app.rebootx.services.ollama_service import OllamaService
from app.rebootx.services.risk_engine import apply_risk_engine

logger = logging.getLogger(__name__)

RISK_ORDER = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]

SYSTEM_PROMPT = """You are RebootX, an enterprise technology refresh compatibility analyst.
Analyze upgrade requests using ONLY the provided knowledge context.
Return valid JSON with this exact shape:
{
  "overall_risk": "Low|Medium|High|Critical",
  "summary": "2-3 sentence executive summary",
  "risks": [
    {
      "category": "dependency|version|config|integration",
      "risk_level": "Low|Medium|High|Critical",
      "title": "short title",
      "explanation": "clear reason grounded in context",
      "recommendation": "specific mitigation step",
      "priority": "P0|P1|P2",
      "validation_checks": ["regression", "build", "integration", "data", "performance", "rollback", "security"]
    }
  ],
  "recommended_actions": ["action 1", "action 2"],
  "confidence": "High|Medium|Low"
}
Identify at least 2 risks when possible. Be conservative for production environments.

For each risk:
- priority: P0 = blocker before cutover, P1 = must validate in staging, P2 = monitor / nice-to-have.
- validation_checks: pick 2-4 from regression|build|integration|data|performance|rollback|security
  that would specifically prove this risk is mitigated.

Pay special attention to INTEGRATION risks that are NOT trivial. When a system is consumed
by multiple teams or multiple languages, reason about each consumer separately:
- A single change (e.g. a database or library upgrade) can break a Java (JDBC) consumer, a
  Python (psycopg2) consumer, and a .NET (ODBC) consumer in DIFFERENT ways — each has its own
  driver/client version requirements and release cycle.
- Consider contract/serialization risks across languages (REST payload shapes, gRPC/protobuf
  stubs, Kafka message schemas, shared Parquet/Avro files).
- Call out the cross-team coordination risk when heterogeneous consumers must all be validated
  before a synchronized cutover.
Prefer specific, per-consumer risks over a single generic "integrations may be affected" risk.

NOTE: Numeric overall_score and final verdict (Go / Go with caution / Caution / Delay) are
computed by the Risk Engine after your response — do not invent a verdict field."""


class AssessmentService:
    def __init__(self, knowledge: KnowledgeService, ollama: OllamaService) -> None:
        self.knowledge = knowledge
        self.ollama = ollama

    async def assess(self, request: UpgradeRequest) -> UpgradeAssessment:
        query = self._build_query(request)
        context_docs = self.knowledge.retrieve(
            query=query,
            technology_type=request.technology_type.value,
            n_results=5,
        )
        context_block = self._format_context(context_docs)

        if await self.ollama.is_available():
            ai_result = await self._assess_with_ai(request, context_block)
            if ai_result:
                assessment = self._merge_integration_risks(ai_result, request)
                return apply_risk_engine(assessment, request, context_docs=context_docs)

        assessment = self._assess_with_rules(request, context_docs)
        return apply_risk_engine(assessment, request, context_docs=context_docs)

    def _merge_integration_risks(
        self, assessment: UpgradeAssessment, request: UpgradeRequest
    ) -> UpgradeAssessment:
        """Guarantee deterministic per-consumer integration risks are present.

        The LLM may miss specific driver/cross-language risks; the analyzer is
        deterministic, so we fold in any of its risks the AI didn't already cover.
        """
        analyzer_risks = analyze_integrations(
            technology_type=request.technology_type,
            integration_details=request.integration_details,
            plain_integrations=request.integrations,
        )
        if not analyzer_risks:
            return assessment

        existing_titles = {r.title.lower() for r in assessment.risks}
        added = [r for r in analyzer_risks if r.title.lower() not in existing_titles]
        if not added:
            return assessment

        assessment.risks.extend(added)
        assessment.overall_risk = self._aggregate_risk(r.risk_level for r in assessment.risks)
        return assessment

    def _build_query(self, request: UpgradeRequest) -> str:
        deps = ", ".join(request.dependencies) if request.dependencies else "none"
        integrations = ", ".join(request.integrations) if request.integrations else "none"
        # Fold in consumer languages/protocols so integration-specific KB cards surface.
        consumer_terms: list[str] = []
        for d in request.integration_details:
            parts = [p for p in (d.consumer_technology, d.protocol) if p]
            if parts:
                consumer_terms.append(" ".join(parts))
        consumers = ", ".join(consumer_terms) if consumer_terms else "none"
        return (
            f"{request.technology_type.value} upgrade from {request.current_version} "
            f"to {request.target_version}. Dependencies: {deps}. Integrations: {integrations}. "
            f"Consumer drivers/protocols: {consumers}."
        )

    @staticmethod
    def _format_consumers(request: UpgradeRequest) -> str:
        if not request.integration_details:
            return "  (none provided)"
        lines = []
        for d in request.integration_details:
            tech = d.consumer_technology or "unknown-language"
            proto = d.protocol or "unknown-protocol"
            team = f", team: {d.owner_team}" if d.owner_team else ""
            lines.append(f"  - {d.name} ({tech} via {proto}{team})")
        return "\n".join(lines)

    @staticmethod
    def _format_context(docs: list[dict]) -> str:
        if not docs:
            return "No specific knowledge documents retrieved."
        lines = []
        for idx, doc in enumerate(docs, start=1):
            source = doc.get("metadata", {}).get("source", "Unknown")
            lines.append(f"[{idx}] Source: {source}\n{doc['text']}")
        return "\n\n".join(lines)

    async def _assess_with_ai(self, request: UpgradeRequest, context: str) -> UpgradeAssessment | None:
        prompt = f"""Upgrade Request:
- Technology: {request.technology_type.value}
- Current Version: {request.current_version}
- Target Version: {request.target_version}
- Dependencies: {', '.join(request.dependencies) or 'none'}
- Integrations: {', '.join(request.integrations) or 'none'}
- Consumers (language / protocol):
{self._format_consumers(request)}
- Environment: {request.environment}
- Notes: {request.notes or 'none'}

Retrieved Knowledge:
{context}

Produce the JSON assessment."""

        raw = await self.ollama.generate(prompt=prompt, system=SYSTEM_PROMPT)
        parsed = self.ollama.extract_json(raw or "")
        if not parsed:
            logger.warning("Failed to parse Ollama JSON response")
            return None

        try:
            risks = [
                self._parse_risk_item(item)
                for item in parsed.get("risks", [])
            ]
            return UpgradeAssessment(
                technology_type=request.technology_type,
                current_version=request.current_version,
                target_version=request.target_version,
                overall_risk=RiskLevel(parsed["overall_risk"]),
                summary=parsed["summary"],
                risks=risks,
                recommended_actions=parsed.get("recommended_actions", []),
                confidence=parsed.get("confidence", "Medium"),
                analysis_mode="ai",
            )
        except (KeyError, ValueError) as exc:
            logger.warning("Invalid AI assessment payload: %s", exc)
            return None

    @staticmethod
    def _parse_risk_item(item: dict) -> IdentifiedRisk:
        """Parse one LLM risk object, tolerating missing optional Risk Engine fields."""
        priority = None
        raw_priority = item.get("priority")
        if raw_priority:
            try:
                priority = PriorityLevel(str(raw_priority).upper())
            except ValueError:
                priority = None

        checks: list[ValidationCheck] = []
        for raw in item.get("validation_checks") or []:
            try:
                checks.append(ValidationCheck(str(raw).strip().lower()))
            except ValueError:
                continue

        return IdentifiedRisk(
            category=item["category"],
            risk_level=RiskLevel(item["risk_level"]),
            title=item["title"],
            explanation=item["explanation"],
            recommendation=item["recommendation"],
            priority=priority,
            validation_checks=checks,
        )

    def _assess_with_rules(self, request: UpgradeRequest, context_docs: list[dict]) -> UpgradeAssessment:
        risks: list[IdentifiedRisk] = []

        major_jump = self._is_major_version_jump(request.current_version, request.target_version)
        if major_jump:
            risks.append(
                IdentifiedRisk(
                    category="version",
                    risk_level=RiskLevel.HIGH,
                    title="Major version jump detected",
                    explanation=(
                        f"Upgrade from {request.current_version} to {request.target_version} "
                        "crosses a major release boundary and commonly introduces breaking changes."
                    ),
                    recommendation="Run full regression and integration test suites in staging before production.",
                )
            )

        if request.dependencies:
            risks.append(
                IdentifiedRisk(
                    category="dependency",
                    risk_level=RiskLevel.MEDIUM,
                    title="Dependency compatibility review required",
                    explanation=(
                        f"The upgrade affects {len(request.dependencies)} declared dependencies "
                        "that may not support the target runtime or platform version."
                    ),
                    recommendation="Regenerate lock files and validate each dependency against the target version.",
                )
            )

        integration_risks = analyze_integrations(
            technology_type=request.technology_type,
            integration_details=request.integration_details,
            plain_integrations=request.integrations,
        )
        if integration_risks:
            risks.extend(integration_risks)
        elif request.integrations:
            risks.append(
                IdentifiedRisk(
                    category="integration",
                    risk_level=RiskLevel.MEDIUM,
                    title="Downstream integration impact",
                    explanation=(
                        f"{len(request.integrations)} integrations may be affected by API, "
                        "configuration, or runtime behavior changes."
                    ),
                    recommendation="Notify integration owners and execute end-to-end validation for each connected system.",
                )
            )

        if request.environment and request.environment.lower() == "production":
            risks.append(
                IdentifiedRisk(
                    category="config",
                    risk_level=RiskLevel.HIGH,
                    title="Production environment upgrade",
                    explanation="Production upgrades require stricter change controls and rollback planning.",
                    recommendation="Require CAB approval, backup verification, and a documented rollback plan.",
                )
            )

        for doc in context_docs[:2]:
            topic = doc.get("metadata", {}).get("topic", "compatibility")
            risks.append(
                IdentifiedRisk(
                    category=topic if topic in {"dependency", "version", "config", "integration"} else "version",
                    risk_level=RiskLevel.MEDIUM,
                    title=f"Known compatibility concern ({doc.get('metadata', {}).get('source', 'Knowledge Base')})",
                    explanation=doc["text"][:280] + ("..." if len(doc["text"]) > 280 else ""),
                    recommendation="Review referenced release notes and apply documented migration steps.",
                )
            )

        if not risks:
            risks.append(
                IdentifiedRisk(
                    category="version",
                    risk_level=RiskLevel.LOW,
                    title="Limited knowledge available",
                    explanation="No specific compatibility issues were found in the knowledge base for this upgrade path.",
                    recommendation="Proceed with standard pre-upgrade checks and monitor closely after deployment.",
                )
            )

        overall = self._aggregate_risk(r.risk_level for r in risks)
        summary = (
            f"Rules-based assessment for {request.technology_type.value} upgrade "
            f"({request.current_version} → {request.target_version}) indicates {overall.value} overall risk."
        )

        return UpgradeAssessment(
            technology_type=request.technology_type,
            current_version=request.current_version,
            target_version=request.target_version,
            overall_risk=overall,
            summary=summary,
            risks=risks,
            recommended_actions=[
                "Validate upgrade path in a non-production environment",
                "Review dependency and integration test results",
                "Prepare rollback and communication plan",
            ],
            confidence="Medium" if context_docs else "Low",
            analysis_mode="rules_fallback",
        )

    @staticmethod
    def _is_major_version_jump(current: str, target: str) -> bool:
        current_parts = [int(p) for p in __import__("re").findall(r"\d+", current)[:2]]
        target_parts = [int(p) for p in __import__("re").findall(r"\d+", target)[:2]]
        if not current_parts or not target_parts:
            return current.strip().lower() != target.strip().lower()
        return target_parts[0] > current_parts[0] or (
            len(current_parts) > 1 and len(target_parts) > 1 and target_parts[0] == current_parts[0] and target_parts[1] > current_parts[1] + 1
        )

    @staticmethod
    def _aggregate_risk(levels: Iterable[RiskLevel]) -> RiskLevel:
        max_idx = max(RISK_ORDER.index(level) for level in levels)
        return RISK_ORDER[max_idx]
