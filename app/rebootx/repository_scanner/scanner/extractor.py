"""Component 3: Dependency Extractor — Extract dependencies from source code and manifests.

Input:  Classified list[FileInfo]
Output: list[Dependency]  +  each Python FileInfo.imports is populated

Two strategies:
  A) Parse requirements.txt / pyproject.toml for package names + versions
  B) Parse .py files using Python's AST module for actual import statements
Then merge both to get: name + version + where it's used.
"""

import ast
import re
from pathlib import Path

from app.rebootx.repository_scanner.models.file_info import FileInfo
from app.rebootx.repository_scanner.models.dependency import Dependency


def extract_all(files: list[FileInfo]) -> list[Dependency]:
    """Extract all dependencies from the file list.

    1. Parses requirements.txt for versioned dependencies.
    2. Parses pyproject.toml [project.dependencies] if present.
    3. AST-parses every .py file for import statements.
    4. Merges: requirements.txt provides versions, AST provides actual usage.

    Args:
        files: Classified list of FileInfo objects.

    Returns:
        Deduplicated list of Dependency objects.
    """
    # Step A: Get versioned deps from manifest files
    req_deps: dict[str, Dependency] = {}

    for f in files:
        if f.path.name == "requirements.txt":
            for dep in _parse_requirements_txt(f.path):
                req_deps[dep.name.lower()] = dep

        elif f.path.name == "pyproject.toml":
            for dep in _parse_pyproject_toml(f.path):
                req_deps[dep.name.lower()] = dep

    # Step B: Get actual imports from .py files via AST
    for f in files:
        if f.is_python:
            f.imports = _extract_imports_ast(f)

    # Step C: Merge — combine versioned deps with import-discovered deps
    all_deps = dict(req_deps)

    for f in files:
        if f.imports:
            for imp in f.imports:
                key = imp.lower()
                if key not in all_deps:
                    all_deps[key] = Dependency(
                        name=imp,
                        version=None,
                        source=f.relative_path,
                    )

    return list(all_deps.values())


def _parse_requirements_txt(file_path: Path) -> list[Dependency]:
    """Parse requirements.txt into Dependency objects.

    Handles formats like:
        psycopg2==2.9.3
        pandas>=1.5.0
        numpy
        -e ./local-package   (skipped)
        # comments           (skipped)
    """
    deps = []
    try:
        lines = file_path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return deps

    for line in lines:
        line = line.strip()

        # Skip empty lines, comments, flags, and editable installs
        if not line or line.startswith("#") or line.startswith("-"):
            continue

        # Match: package_name followed by optional version specifier
        match = re.match(
            r"^([a-zA-Z0-9][a-zA-Z0-9._-]*)\s*(?:([=<>!~]=?)\s*([\d.*]+))?",
            line,
        )
        if match:
            name = match.group(1)
            version = match.group(3)  # None if no version specified
            deps.append(Dependency(name=name, version=version, source="requirements.txt"))

    return deps


def _parse_pyproject_toml(file_path: Path) -> list[Dependency]:
    """Parse pyproject.toml [project.dependencies] for dependencies.

    Uses regex instead of tomllib to avoid Python 3.11+ requirement.
    """
    deps = []
    try:
        content = file_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return deps

    # Find the dependencies list in [project] section
    # Matches lines like: "psycopg2>=2.9.3",
    in_deps_section = False
    for line in content.splitlines():
        stripped = line.strip()

        if stripped.startswith("dependencies"):
            in_deps_section = True
            continue

        if in_deps_section:
            if stripped == "]":
                break

            # Extract package name and version from quoted string
            match = re.match(
                r"""[\"']([a-zA-Z0-9][a-zA-Z0-9._-]*)\s*(?:[=<>!~]=?\s*([\d.*]+))?""",
                stripped,
            )
            if match:
                name = match.group(1)
                version = match.group(2)
                deps.append(Dependency(name=name, version=version, source="pyproject.toml"))

    return deps


def _extract_imports_ast(file_info: FileInfo) -> list[str]:
    """Use Python's AST module to extract import statements from a .py file.

    Returns top-level package names only:
        import pandas           → "pandas"
        from sqlalchemy import  → "sqlalchemy"
        from app.db import conn → "app"
    """
    try:
        source = file_info.path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(file_info.path))
    except (SyntaxError, OSError, UnicodeDecodeError):
        return []

    imports: set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                # "import pandas.core" → "pandas"
                imports.add(alias.name.split(".")[0])

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                # "from sqlalchemy.orm import Session" → "sqlalchemy"
                imports.add(node.module.split(".")[0])

    return sorted(imports)
