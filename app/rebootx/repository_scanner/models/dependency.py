"""Data class representing a dependency (package) found in the repository."""

from dataclasses import dataclass


@dataclass
class Dependency:
    """A dependency discovered via requirements.txt or source code imports.

    Attributes:
        name: Package name (e.g., "psycopg2")
        version: Version string if known (e.g., "2.9.3"), None if only found via import
        source: Where the dependency was found (e.g., "requirements.txt" or "app/db/connection.py")
    """

    name: str
    version: str | None = None
    source: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "source": self.source,
        }
