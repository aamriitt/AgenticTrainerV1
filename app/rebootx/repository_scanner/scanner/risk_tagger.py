"""Component 5: Risk Tagger — Apply deterministic rules to flag known risks.

Input:  list[Dependency], detected database
Output: list[RiskFlag]

These are rule-based checks — no LLM involved. Each rule matches against
the dependency list and produces a risk flag if the condition is true.

V1 rules focus on Python + PostgreSQL upgrade risks.
"""

from app.rebootx.repository_scanner.models.dependency import Dependency
from app.rebootx.repository_scanner.models.scan_result import RiskFlag


def tag_risks(dependencies: list[Dependency], database: str) -> list[RiskFlag]:
    """Apply all risk rules against the dependency list.

    Args:
        dependencies: List of all discovered dependencies.
        database: Detected database string (e.g., "PostgreSQL").

    Returns:
        List of RiskFlag objects for each matched rule.
    """
    flags: list[RiskFlag] = []
    dep_lookup = {d.name.lower().replace("-", "_"): d for d in dependencies}

    for rule in _RISK_RULES:
        result = rule(dep_lookup, database)
        if result:
            flags.append(result)

    return flags


# ---------------------------------------------------------------------------
# Risk rules — each is a function that returns a RiskFlag or None
# ---------------------------------------------------------------------------


def _check_psycopg2(deps: dict, database: str) -> RiskFlag | None:
    """psycopg2 may need updates for PG 16 SCRAM-SHA-256 default auth."""
    if "psycopg2" in deps or "psycopg2_binary" in deps:
        return RiskFlag(
            component="psycopg2",
            reason=(
                "PostgreSQL 16 defaults to SCRAM-SHA-256 authentication. "
                "Verify psycopg2 version >= 2.9 supports this auth method. "
                "Consider migrating to psycopg3 (python-oracledb successor pattern)."
            ),
        )
    return None


def _check_sqlalchemy_v1(deps: dict, database: str) -> RiskFlag | None:
    """SQLAlchemy 1.x works with PG 16 but emits deprecation warnings."""
    dep = deps.get("sqlalchemy")
    if dep and dep.version and dep.version.startswith("1."):
        return RiskFlag(
            component=f"SQLAlchemy {dep.version}",
            reason=(
                "SQLAlchemy 1.x is in maintenance mode. It works with PostgreSQL 16 "
                "but emits deprecation warnings. Consider upgrading to SQLAlchemy 2.0+ "
                "for long-term support."
            ),
        )
    return None


def _check_django_old(deps: dict, database: str) -> RiskFlag | None:
    """Django < 4.0 is EOL and doesn't officially support Python 3.12."""
    dep = deps.get("django")
    if dep and dep.version:
        try:
            major = int(dep.version.split(".")[0])
            if major < 4:
                return RiskFlag(
                    component=f"Django {dep.version}",
                    reason=(
                        f"Django {dep.version} is End-of-Life and does not officially "
                        "support Python 3.12. Must upgrade to Django 4.2 LTS or 5.0+ "
                        "before upgrading Python."
                    ),
                )
        except (ValueError, IndexError):
            pass
    return None


def _check_alembic_pg16(deps: dict, database: str) -> RiskFlag | None:
    """Alembic migrations may need testing against PG 16 schema changes."""
    if "alembic" in deps and database == "PostgreSQL":
        return RiskFlag(
            component="Alembic",
            reason=(
                "Alembic migration scripts should be tested against PostgreSQL 16. "
                "PG 16 changes to system catalogs (pg_catalog) may affect "
                "auto-generated migrations."
            ),
        )
    return None


def _check_pgbouncer(deps: dict, database: str) -> RiskFlag | None:
    """pgbouncer may need config updates for PG 16."""
    if "pgbouncer" in deps and database == "PostgreSQL":
        return RiskFlag(
            component="pgbouncer",
            reason=(
                "pgbouncer may need configuration updates for PostgreSQL 16's "
                "SCRAM-SHA-256 default authentication. Verify pgbouncer version "
                "supports SCRAM and update auth_type in pgbouncer.ini."
            ),
        )
    return None


# All rules collected for iteration
_RISK_RULES = [
    _check_psycopg2,
    _check_sqlalchemy_v1,
    _check_django_old,
    _check_alembic_pg16,
    _check_pgbouncer,
]
