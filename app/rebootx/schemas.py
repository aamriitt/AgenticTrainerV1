"""Pydantic schemas for RebootX API."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TechnologyType(str, Enum):
    DATABASE = "database"
    EMR = "emr"
    PYTHON = "python"
    MWAA = "mwaa"


class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class PriorityLevel(str, Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"


class Verdict(str, Enum):
    GO = "Go"
    GO_WITH_CAUTION = "Go with caution"
    CAUTION = "Caution"
    DELAY = "Delay"
    NO_GO = "No-Go"  # kept for compatibility; Risk Engine no longer emits this


class ValidationCheck(str, Enum):
    REGRESSION = "regression"
    BUILD = "build"
    INTEGRATION = "integration"
    DATA = "data"
    PERFORMANCE = "performance"
    ROLLBACK = "rollback"
    SECURITY = "security"


class IntegrationDetail(BaseModel):
    """A consumer of the system being upgraded.

    Modeling *who* consumes a system (and how) is what lets RebootX surface
    non-trivial, cross-team / cross-language integration risks. Example: a
    single PostgreSQL upgrade may be consumed by a Java service over JDBC, a
    Python ETL over psycopg2, and a .NET report over ODBC — each with its own
    driver-compatibility profile and independent release cycle.
    """

    name: str = Field(..., description="Name of the consuming system/team", examples=["Claims processing service"])
    consumer_technology: Optional[str] = Field(
        default=None,
        description="Language/stack of the consumer",
        examples=["java", "python", "dotnet", "nodejs", "go", "scala"],
    )
    protocol: Optional[str] = Field(
        default=None,
        description="How it connects/consumes",
        examples=["JDBC", "ODBC", "psycopg2", "REST", "gRPC", "Kafka", "shared-database", "parquet"],
    )
    owner_team: Optional[str] = Field(default=None, description="Team that owns this consumer")
    notes: Optional[str] = Field(default=None)


class UpgradeRequest(BaseModel):
    technology_type: TechnologyType = Field(..., description="Type of technology being upgraded")
    current_version: str = Field(..., examples=["PostgreSQL 13.4", "Python 3.9", "EMR 6.10"])
    target_version: str = Field(..., examples=["PostgreSQL 15.2", "Python 3.12", "EMR 7.0"])
    dependencies: list[str] = Field(default_factory=list, examples=[["sqlalchemy==1.4", "psycopg2-binary"]])
    integrations: list[str] = Field(
        default_factory=list,
        examples=[["Airflow DAGs", "Spark jobs", "BI reporting layer"]],
    )
    integration_details: list[IntegrationDetail] = Field(
        default_factory=list,
        description="Structured consumers with language/protocol for deep cross-team risk analysis",
    )
    environment: Optional[str] = Field(default="production", examples=["production", "staging"])
    notes: Optional[str] = Field(default=None, description="Additional context about the upgrade")


class IdentifiedRisk(BaseModel):
    category: str = Field(..., description="Risk category: dependency, version, config, integration")
    risk_level: RiskLevel
    title: str
    explanation: str
    recommendation: str
    score: Optional[int] = Field(
        default=None,
        ge=0,
        le=100,
        description="Numeric risk score 0-100 (computed by Risk Engine)",
    )
    priority: Optional[PriorityLevel] = Field(
        default=None,
        description="P0/P1/P2 priority based on severity and impact",
    )
    validation_checks: list[ValidationCheck] = Field(
        default_factory=list,
        description="Recommended validation checks for this risk",
    )


class UpgradeAssessment(BaseModel):
    technology_type: TechnologyType
    current_version: str
    target_version: str
    overall_risk: RiskLevel
    summary: str
    risks: list[IdentifiedRisk]
    recommended_actions: list[str]
    confidence: str = Field(..., description="Assessment confidence based on available knowledge")
    analysis_mode: str = Field(..., description="ai or rules_fallback")
    overall_score: Optional[int] = Field(
        default=None,
        ge=0,
        le=100,
        description="Aggregated numeric risk score 0-100 (higher = riskier)",
    )
    verdict: Optional[Verdict] = Field(
        default=None,
        description="Final readiness verdict: Go | Go with caution | Caution | Delay",
    )
    validation_checks: list[ValidationCheck] = Field(
        default_factory=list,
        description="Deduplicated validation checks recommended across all risks",
    )


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    ollama_available: bool
    knowledge_documents: int
    llm_model: Optional[str] = None
    analysis_mode: str = "rules_fallback"


class LLMStatusResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    enabled: bool = Field(..., description="Whether the LLM backend is enabled in config")
    server_up: bool = Field(..., description="Whether the Ollama server is reachable")
    model: str = Field(..., description="Configured model name")
    model_present: bool = Field(..., description="Whether the configured model is pulled")
    available: bool = Field(..., description="True when assessments will use the LLM")
    base_url: str
    available_models: list[str] = Field(default_factory=list)
    detail: str = Field(..., description="Human-readable status explanation")


class SourceType(str, Enum):
    LOCAL = "local"
    GITHUB = "github"


class CaptureRequest(BaseModel):
    source_type: SourceType = Field(..., description="Where to capture upgrade input from")
    location: str = Field(
        ...,
        description="Local folder path or public GitHub repo URL",
        examples=["C:/Coding Practice/rebootx", "https://github.com/apache/airflow"],
    )
    target_version: Optional[str] = Field(
        default=None,
        description="Desired upgrade target; if omitted it is left unspecified",
        examples=["Python 3.12", "PostgreSQL 15.2"],
    )
    technology_type: Optional[TechnologyType] = Field(
        default=None,
        description="Override the auto-detected technology type",
    )
    environment: Optional[str] = Field(default="production", examples=["production", "staging"])


class CapturedInput(BaseModel):
    technology_type: TechnologyType
    current_version: str
    target_version: str
    dependencies: list[str]
    integrations: list[str]
    environment: Optional[str] = "production"
    detected_from: list[str] = Field(default_factory=list, description="Manifest files that were read")
    warnings: list[str] = Field(default_factory=list, description="Anything the user should confirm manually")
    source_type: SourceType
    location: str


class ScanAndAssessRequest(BaseModel):
    """Bridge endpoint: scan a repository, then run an assessment in one call."""

    repo_path: str = Field(
        ...,
        description="Path to the repository to scan",
        examples=["./", "C:/Coding Practice/rebootx"],
    )
    target_version: str = Field(
        ...,
        description="Target version for the upgrade",
        examples=["PostgreSQL 16", "Python 3.12"],
    )
    current_version: Optional[str] = Field(
        default=None,
        description="Current version (auto-detected from the scan if omitted)",
    )
    environment: Optional[str] = Field(default="production", examples=["production", "staging"])


class KnowledgeDocumentInput(BaseModel):
    id: str = Field(..., description="Unique document ID, e.g. python-39-to-312-breaking")
    text: str = Field(..., min_length=20, description="Compatibility knowledge content (3-8 sentences)")
    technology_type: TechnologyType
    source: str = Field(..., examples=["PostgreSQL 15 Release Notes"])
    topic: str = Field(..., examples=["version", "dependency", "config", "integration"])
    version_from: Optional[str] = None
    version_to: Optional[str] = None
    risk_hint: Optional[str] = Field(default=None, examples=["Low", "Medium", "High", "Critical"])


class KnowledgeStatsResponse(BaseModel):
    total_documents: int
    chroma_documents: int
    source_files: int
    by_technology_type: dict[str, int]
    by_topic: dict[str, int]
    knowledge_dir: str
