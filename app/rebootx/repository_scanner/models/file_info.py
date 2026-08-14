"""Data class representing a discovered file in the repository."""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class FileInfo:
    """Represents a single file discovered during repository traversal.

    Created by traversal.py with path/extension only.
    Enriched by classifier.py (language) and extractor.py (imports).
    """

    path: Path
    relative_path: str
    extension: str
    language: str = ""
    imports: list[str] = field(default_factory=list)

    @property
    def is_python(self) -> bool:
        return self.language == "Python"

    @property
    def is_sql(self) -> bool:
        return self.language == "SQL"

    @property
    def module_name(self) -> str:
        """Return the Python module name (filename without extension)."""
        return self.path.stem
