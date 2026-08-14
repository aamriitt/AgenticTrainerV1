"""Risk Engine — score, prioritize, map validation checks, and produce a verdict.

Takes a raw assessment (from LLM or rules) and enriches it deterministically so
the API always returns numeric scores, P0/P1/P2 priorities, validation checks,
and a Go / Go with caution / Caution / Delay verdict.
"""

from __future__ import annotations

from app.rebootx.schemas import (
    IdentifiedRisk,
    PriorityLevel,
    RiskLevel,
    UpgradeAssessment,
    UpgradeRequest,
    ValidationCheck,
    Verdict,
)

# Numeric score per qualitative risk level (0–100, higher = riskier).
LEVEL_SCORES: dict[RiskLevel, int] = {
    RiskLevel.LOW: 20,
    RiskLevel.MEDIUM: 45,
    RiskLevel.HIGH: 70,
    RiskLevel.CRITICAL: 90,
}

# Category → default validation checks when the LLM/KB does not specify any.
CATEGORY_CHECKS: dict[str, list[ValidationCheck]] = {
    "dependency": [ValidationCheck.BUILD, ValidationCheck.REGRESSION, ValidationCheck.INTEGRATION],
    "version": [ValidationCheck.REGRESSION, ValidationCheck.ROLLBACK, ValidationCheck.INTEGRATION],
    "config": [ValidationCheck.ROLLBACK, ValidationCheck.SECURITY, ValidationCheck.REGRESSION],
    "integration": [ValidationCheck.INTEGRATION, ValidationCheck.REGRESSION, ValidationCheck.DATA],
}

# Keyword hints that pull in additional checks (keep phrases specific — avoid
# ultra-broad tokens like bare "data" / "sql" that match almost every DB upgrade).
KEYWORD_CHECKS: list[tuple[tuple[str, ...], ValidationCheck]] = [
    (("auth", "scram", "tls", "ssl", "security", "credential", "encryption"), ValidationCheck.SECURITY),
    (("schema migration", "data loss", "parquet", "avro", "etl", "replication"), ValidationCheck.DATA),
    (("performance", "latency", "throughput", "slow query"), ValidationCheck.PERFORMANCE),
    (("compile", "wheel", "jar", "packaging", "lock file"), ValidationCheck.BUILD),
    (("rollback", "backup", "cutover plan", "restore"), ValidationCheck.ROLLBACK),
]

VALID_CHECK_VALUES = {c.value for c in ValidationCheck}


def score_for_level(level: RiskLevel) -> int:
    return LEVEL_SCORES.get(level, 45)


def priority_for(
    level: RiskLevel,
    *,
    environment: str | None = None,
    category: str | None = None,
) -> PriorityLevel:
    """Map severity (+ production/integration impact) to P0/P1/P2."""
    is_production = (environment or "").lower() == "production"
    is_integration = (category or "").lower() == "integration"

    if level == RiskLevel.CRITICAL:
        return PriorityLevel.P0
    if level == RiskLevel.HIGH:
        # High + production (or integration) escalates to P0.
        if is_production or is_integration:
            return PriorityLevel.P0
        return PriorityLevel.P1
    if level == RiskLevel.MEDIUM:
        if is_production and is_integration:
            return PriorityLevel.P1
        return PriorityLevel.P1 if is_production else PriorityLevel.P2
    return PriorityLevel.P2


def _normalize_checks(raw: list | None) -> list[ValidationCheck]:
    if not raw:
        return []
    out: list[ValidationCheck] = []
    seen: set[str] = set()
    for item in raw:
        value = item.value if isinstance(item, ValidationCheck) else str(item).strip().lower()
        if value not in VALID_CHECK_VALUES or value in seen:
            continue
        seen.add(value)
        out.append(ValidationCheck(value))
    return out


def map_validation_checks(risk: IdentifiedRisk) -> list[ValidationCheck]:
    """Resolve validation checks for a risk.

    Preference order:
    1. Checks already set on the risk (e.g. from LLM)
    2. Category defaults + keyword hints from title/explanation/recommendation
    """
    if risk.validation_checks:
        return _normalize_checks(list(risk.validation_checks))

    checks = list(CATEGORY_CHECKS.get((risk.category or "").lower(), [ValidationCheck.REGRESSION]))
    blob = f"{risk.title} {risk.explanation} {risk.recommendation}".lower()
    for keywords, check in KEYWORD_CHECKS:
        if any(k in blob for k in keywords) and check not in checks:
            checks.append(check)
    return checks


def enrich_risk(
    risk: IdentifiedRisk,
    *,
    environment: str | None = None,
) -> IdentifiedRisk:
    checks = map_validation_checks(risk)
    score = risk.score if risk.score is not None else score_for_level(risk.risk_level)
    # Clamp and bump slightly when security exposure is attached.
    if ValidationCheck.SECURITY in checks and score < 95:
        score = min(100, score + 5)
    priority = risk.priority or priority_for(
        risk.risk_level,
        environment=environment,
        category=risk.category,
    )
    return risk.model_copy(
        update={
            "score": score,
            "priority": priority,
            "validation_checks": checks,
        }
    )


def aggregate_overall_score(risks: list[IdentifiedRisk]) -> int:
    if not risks:
        return 0
    scores = [r.score if r.score is not None else score_for_level(r.risk_level) for r in risks]
    # Weight toward the worst risks: 60% max + 40% mean.
    max_score = max(scores)
    mean_score = sum(scores) / len(scores)
    return int(round(0.6 * max_score + 0.4 * mean_score))


def derive_verdict(
    overall_score: int,
    overall_risk: RiskLevel,
    risks: list[IdentifiedRisk],
    *,
    environment: str | None = None,
) -> Verdict:
    """Deterministic readiness verdict from score + severity + blockers.

    Pilot policy: never emit No-Go. Elevated risk lands on Delay (preferred)
    or Caution so demos stay advisory rather than hard-blocking.
    """
    has_p0 = any(r.priority == PriorityLevel.P0 for r in risks)
    has_critical = any(r.risk_level == RiskLevel.CRITICAL for r in risks)
    is_production = (environment or "").lower() == "production"

    # Former No-Go band → Delay.
    if has_critical or overall_risk == RiskLevel.CRITICAL or overall_score >= 80:
        return Verdict.DELAY
    # High / P0 band → mostly Delay (production or score ≥ 55); else Caution.
    if has_p0 or overall_risk == RiskLevel.HIGH or overall_score >= 60:
        if is_production or overall_score >= 55:
            return Verdict.DELAY
        return Verdict.CAUTION
    if overall_risk == RiskLevel.MEDIUM or overall_score >= 35:
        return Verdict.CAUTION
    return Verdict.GO


def _ordered_checks(present: set[ValidationCheck]) -> list[ValidationCheck]:
    preferred = [
        ValidationCheck.REGRESSION,
        ValidationCheck.BUILD,
        ValidationCheck.INTEGRATION,
        ValidationCheck.DATA,
        ValidationCheck.PERFORMANCE,
        ValidationCheck.SECURITY,
        ValidationCheck.ROLLBACK,
    ]
    ordered = [c for c in preferred if c in present]
    ordered.extend(c for c in present if c not in ordered)
    return ordered


def collect_validation_checks(risks: list[IdentifiedRisk]) -> list[ValidationCheck]:
    return _ordered_checks({c for r in risks for c in r.validation_checks})


def apply_risk_engine(
    assessment: UpgradeAssessment,
    request: UpgradeRequest,
    *,
    context_docs: list[dict] | None = None,
) -> UpgradeAssessment:
    """Enrich an assessment with scores, priorities, checks, and a verdict."""
    enriched_risks = [
        enrich_risk(risk, environment=request.environment)
        for risk in assessment.risks
    ]

    overall_score = aggregate_overall_score(enriched_risks)
    # Keep qualitative overall_risk aligned with the worst enriched risk.
    if enriched_risks:
        order = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
        worst = max(enriched_risks, key=lambda r: order.index(r.risk_level))
        overall_risk = worst.risk_level
    else:
        overall_risk = assessment.overall_risk

    verdict = derive_verdict(
        overall_score,
        overall_risk,
        enriched_risks,
        environment=request.environment,
    )

    # Assessment-level checks = per-risk checks ∪ KB tags from retrieved docs.
    present = {c for r in enriched_risks for c in r.validation_checks}
    for doc in context_docs or []:
        raw = (doc.get("metadata") or {}).get("validation_checks", "")
        values = raw.split(",") if isinstance(raw, str) else (raw or [])
        present.update(_normalize_checks([str(v).strip() for v in values if str(v).strip()]))
    checks = _ordered_checks(present)

    return assessment.model_copy(
        update={
            "risks": enriched_risks,
            "overall_risk": overall_risk,
            "overall_score": overall_score,
            "verdict": verdict,
            "validation_checks": checks,
        }
    )
