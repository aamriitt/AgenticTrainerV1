"""Bridge Service — connects the Repository Scanner to the Assessment Engine.

This is the KEY INTEGRATION PIECE. It takes the output of the existing
repository_scanner module and converts it into an UpgradeRequest that the
assessment service can process.

Flow:
    repo_path + target_version
        → repository_scanner.scan()
        → ScanResult
        → BridgeService.scan_result_to_request()
        → UpgradeRequest
        → AssessmentService.assess()
        → UpgradeAssessment
"""

import logging

from app.rebootx.schemas import IntegrationDetail, TechnologyType, UpgradeRequest
from app.rebootx.repository_scanner.services.scan_service import scan

logger = logging.getLogger(__name__)

# Map detected database names to TechnologyType
DATABASE_TECH_MAP = {
    "postgresql": TechnologyType.DATABASE,
    "mysql": TechnologyType.DATABASE,
    "oracle": TechnologyType.DATABASE,
}

# Map detected languages to TechnologyType
LANGUAGE_TECH_MAP = {
    "python": TechnologyType.PYTHON,
}


class BridgeService:
    """Adapter that converts ScanResult → UpgradeRequest."""

    @staticmethod
    def scan_repository(repo_path: str) -> dict:
        """Run the repository scanner and return the result as a dict.

        Args:
            repo_path: Path to the repository to scan.

        Returns:
            ScanResult.to_dict() — the full scan output.
        """
        result = scan(repo_path)
        return result.to_dict()

    @staticmethod
    def detect_technology_type(scan_dict: dict) -> TechnologyType:
        """Auto-detect the technology type from scan results.

        Priority:
        1. Database detection (if scanner found PostgreSQL, etc.)
        2. Language detection (if Python is the dominant language)
        3. Default to PYTHON
        """
        # Check database
        database = scan_dict.get("database", "").lower()
        if database and database in DATABASE_TECH_MAP:
            return DATABASE_TECH_MAP[database]

        # Check dominant language
        languages = scan_dict.get("languages", {})
        if languages:
            dominant = max(languages, key=languages.get)
            if dominant.lower() in LANGUAGE_TECH_MAP:
                return LANGUAGE_TECH_MAP[dominant.lower()]

        return TechnologyType.PYTHON

    @staticmethod
    def build_dependency_list(scan_dict: dict) -> list[str]:
        """Convert scanner dependencies to string list for UpgradeRequest.

        Format: "package_name==version" if version known, else "package_name"
        """
        deps = scan_dict.get("dependencies", [])
        result = []
        for dep in deps:
            name = dep.get("name", "")
            version = dep.get("version")
            if name:
                if version:
                    result.append(f"{name}=={version}")
                else:
                    result.append(name)
        return result

    @staticmethod
    def build_integration_details(scan_dict: dict) -> list[IntegrationDetail]:
        """Build structured consumers (name + language + protocol + team) from the scan.

        Prefers the scanner's multi-team ``consumers`` (which carry real language,
        protocol, and owning team per component) so cross-team / cross-language
        risks surface automatically. Falls back to dependency-based inference for
        single-component repos where no per-service manifests were found.
        """
        # Preferred: use the multi-team consumers detected by the scanner
        consumers = scan_dict.get("consumers", [])
        if consumers:
            return [
                IntegrationDetail(
                    name=c.get("name", "Consumer"),
                    consumer_technology=c.get("consumer_technology"),
                    protocol=c.get("protocol"),
                    owner_team=c.get("owner_team"),
                )
                for c in consumers
            ]

        # Fallback: infer from detected dependencies (single Python component)
        details: list[IntegrationDetail] = []
        deps = {d.get("name", "").lower() for d in scan_dict.get("dependencies", [])}
        pg_drivers = {"psycopg2", "psycopg2-binary", "psycopg", "asyncpg", "aiopg", "pg8000"}

        database = scan_dict.get("database", "")
        if database:
            driver = "psycopg2" if deps & {"psycopg2", "psycopg2-binary", "psycopg"} else (
                "asyncpg" if "asyncpg" in deps else None
            )
            details.append(
                IntegrationDetail(
                    name=f"{database} access layer",
                    consumer_technology="python",
                    protocol=driver,
                )
            )
        elif deps & pg_drivers:
            details.append(
                IntegrationDetail(name="Database access layer", consumer_technology="python", protocol="psycopg2")
            )

        if deps & {"fastapi", "flask", "django"}:
            details.append(IntegrationDetail(name="Web API layer", consumer_technology="python", protocol="REST"))
        if "celery" in deps:
            details.append(IntegrationDetail(name="Celery task queue", consumer_technology="python", protocol=None))
        if deps & {"airflow", "apache-airflow"}:
            details.append(IntegrationDetail(name="Airflow DAGs", consumer_technology="python", protocol=None))
        if deps & {"boto3", "botocore"}:
            details.append(
                IntegrationDetail(name="AWS service integrations", consumer_technology="python", protocol="REST")
            )
        if "pyspark" in deps:
            details.append(IntegrationDetail(name="Spark jobs", consumer_technology="python", protocol="parquet"))
        if "redis" in deps:
            details.append(IntegrationDetail(name="Redis cache/messaging", consumer_technology="python", protocol=None))
        if deps & {"kafka", "confluent-kafka", "kafka-python"}:
            details.append(IntegrationDetail(name="Kafka streaming", consumer_technology="python", protocol="Kafka"))
        if deps & {"requests", "httpx"}:
            details.append(
                IntegrationDetail(name="External HTTP API clients", consumer_technology="python", protocol="REST")
            )

        return details

    @classmethod
    def build_integration_list(cls, scan_dict: dict) -> list[str]:
        """Plain integration names, kept consistent with the structured details."""
        return [d.name for d in cls.build_integration_details(scan_dict)]

    @staticmethod
    def build_notes(scan_dict: dict) -> str:
        """Build enriched notes from scanner risk flags and graph stats.

        This gives the LLM additional context about what the scanner
        already detected deterministically.
        """
        parts = []

        # Include scanner risk flags
        risk_flags = scan_dict.get("risk_flags", [])
        if risk_flags:
            parts.append("Scanner risk flags:")
            for flag in risk_flags:
                parts.append(f"  - [{flag['component']}] {flag['reason']}")

        # Include graph stats
        graph = scan_dict.get("dependency_graph", {})
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])
        if nodes:
            source_count = sum(1 for n in nodes if n.get("type") == "source")
            pkg_count = sum(1 for n in nodes if n.get("type") == "package")
            parts.append(
                f"Dependency graph: {source_count} source files, "
                f"{pkg_count} packages, {len(edges)} edges."
            )

        # Include language breakdown
        languages = scan_dict.get("languages", {})
        if languages:
            lang_str = ", ".join(f"{k}: {v}" for k, v in languages.items())
            parts.append(f"Languages: {lang_str}")

        return "\n".join(parts) if parts else ""

    @classmethod
    def scan_result_to_request(
        cls,
        scan_dict: dict,
        target_version: str,
        current_version: str | None = None,
        environment: str = "production",
    ) -> UpgradeRequest:
        """Convert a ScanResult dict into an UpgradeRequest.

        This is the main adapter method — the bridge between the two systems.

        Args:
            scan_dict: Output of ScanResult.to_dict()
            target_version: e.g., "PostgreSQL 16" or "Python 3.12"
            current_version: Explicit current version, or auto-detected
            environment: "production" or "staging"
        """
        tech_type = cls.detect_technology_type(scan_dict)

        # Auto-detect current version from scan context if not provided
        if not current_version:
            database = scan_dict.get("database", "")
            if database and tech_type == TechnologyType.DATABASE:
                current_version = f"{database} (version detected by scanner)"
            else:
                current_version = f"{tech_type.value} (current)"

        integration_details = cls.build_integration_details(scan_dict)
        return UpgradeRequest(
            technology_type=tech_type,
            current_version=current_version,
            target_version=target_version,
            dependencies=cls.build_dependency_list(scan_dict),
            integrations=[d.name for d in integration_details],
            integration_details=integration_details,
            environment=environment,
            notes=cls.build_notes(scan_dict),
        )

    @classmethod
    def scan_and_build_request(
        cls,
        repo_path: str,
        target_version: str,
        current_version: str | None = None,
        environment: str = "production",
    ) -> tuple[dict, UpgradeRequest]:
        """One-shot: scan a repo and produce an UpgradeRequest.

        Returns:
            Tuple of (scan_result_dict, upgrade_request)
        """
        scan_dict = cls.scan_repository(repo_path)
        request = cls.scan_result_to_request(
            scan_dict=scan_dict,
            target_version=target_version,
            current_version=current_version,
            environment=environment,
        )
        return scan_dict, request
