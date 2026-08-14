"""Component 4: Database Detector — Detect PostgreSQL usage from dependencies.

Input:  list[Dependency]
Output: "PostgreSQL" if any PG driver is found, otherwise ""

V1 only detects PostgreSQL. Future versions can add Oracle, MySQL, etc.
"""

from app.rebootx.repository_scanner.models.dependency import Dependency

# All known Python PostgreSQL driver packages
PG_DRIVERS = {
    "psycopg2",
    "psycopg2-binary",
    "psycopg",        # psycopg3
    "asyncpg",
    "aiopg",
    "pg8000",
}

# Packages that strongly indicate PostgreSQL usage (ORMs/tools configured for PG)
PG_INDICATORS = {
    "django",          # Often used with PG (needs config check for certainty)
    "sqlalchemy",      # Generic, but combined with a PG driver = confirmation
}


def detect_database(dependencies: list[Dependency]) -> str:
    """Check if any PostgreSQL driver package is in the dependency list.

    Args:
        dependencies: List of Dependency objects from the extractor.

    Returns:
        "PostgreSQL" if a PG driver is found, "" otherwise.
    """
    dep_names = {d.name.lower().replace("-", "_") for d in dependencies}

    # Direct driver match — this is definitive
    if dep_names & PG_DRIVERS:
        return "PostgreSQL"

    return ""
