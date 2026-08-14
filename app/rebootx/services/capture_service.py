"""Capture upgrade input automatically from a project's manifest files.

Supports two sources:
  - local:  a path to a project directory on disk
  - github: a public GitHub repository URL

It reads well-known manifest files (requirements.txt, pyproject.toml,
.python-version, runtime.txt, docker-compose.yml, ...), then infers the
technology type, current version, dependencies and integrations.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

import httpx

try:  # Python 3.11+
    import tomllib
except ModuleNotFoundError:  # pragma: no cover
    tomllib = None  # type: ignore

from app.rebootx.schemas import CapturedInput, CaptureRequest, SourceType, TechnologyType

logger = logging.getLogger(__name__)

# Manifest files we know how to read.
KNOWN_FILES = [
    "requirements.txt",
    "requirements-dev.txt",
    "pyproject.toml",
    "Pipfile",
    ".python-version",
    "runtime.txt",
    "setup.cfg",
    "docker-compose.yml",
    "docker-compose.yaml",
    "alembic.ini",
]

GITHUB_API = "https://api.github.com"
GITHUB_RAW = "https://raw.githubusercontent.com"


class CaptureError(Exception):
    """Raised when input cannot be captured from the given source."""


class CaptureService:
    def capture(self, request: CaptureRequest) -> CapturedInput:
        if request.source_type == SourceType.LOCAL:
            files, root_names = self._read_local(request.location)
        else:
            files, root_names = self._read_github(request.location)

        if not files:
            raise CaptureError(
                "No recognizable manifest files found "
                "(looked for requirements.txt, pyproject.toml, .python-version, docker-compose.yml, ...)."
            )

        return self._analyze(request, files, root_names)

    # ------------------------------------------------------------------ #
    # Source readers
    # ------------------------------------------------------------------ #
    def _read_local(self, location: str) -> tuple[dict[str, str], set[str]]:
        root = Path(location).expanduser()
        if not root.exists() or not root.is_dir():
            raise CaptureError(f"Local path not found or not a directory: {location}")

        root_names = {p.name for p in root.iterdir()}
        files: dict[str, str] = {}
        for name in KNOWN_FILES:
            fpath = root / name
            if fpath.exists() and fpath.is_file():
                try:
                    files[name] = fpath.read_text(encoding="utf-8", errors="ignore")
                except OSError as exc:
                    logger.warning("Could not read %s: %s", fpath, exc)
        return files, root_names

    def _read_github(self, location: str) -> tuple[dict[str, str], set[str]]:
        owner, repo, branch = self._parse_github_url(location)
        with httpx.Client(timeout=15.0, headers={"Accept": "application/vnd.github+json"}) as client:
            if branch is None:
                branch = self._github_default_branch(client, owner, repo)
            root_names = self._github_root_names(client, owner, repo, branch)

            files: dict[str, str] = {}
            for name in KNOWN_FILES:
                if name not in root_names:
                    continue
                url = f"{GITHUB_RAW}/{owner}/{repo}/{branch}/{name}"
                try:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        files[name] = resp.text
                except httpx.HTTPError as exc:
                    logger.warning("Failed to fetch %s: %s", url, exc)
        return files, root_names

    @staticmethod
    def _parse_github_url(location: str) -> tuple[str, str, str | None]:
        loc = location.strip().removesuffix(".git")
        branch: str | None = None
        m = re.search(r"github\.com[/:]([^/]+)/([^/]+?)(?:/tree/([^/]+))?/?$", loc)
        if m:
            owner, repo, branch = m.group(1), m.group(2), m.group(3)
        else:
            parts = loc.strip("/").split("/")
            if len(parts) == 2:
                owner, repo = parts
            else:
                raise CaptureError(f"Could not parse GitHub location: {location}")
        return owner, repo, branch

    @staticmethod
    def _github_default_branch(client: httpx.Client, owner: str, repo: str) -> str:
        resp = client.get(f"{GITHUB_API}/repos/{owner}/{repo}")
        if resp.status_code == 404:
            raise CaptureError(f"GitHub repo not found: {owner}/{repo}")
        if resp.status_code == 403:
            raise CaptureError("GitHub API rate limit reached. Try again later or use a local path.")
        resp.raise_for_status()
        return resp.json().get("default_branch", "main")

    @staticmethod
    def _github_root_names(client: httpx.Client, owner: str, repo: str, branch: str) -> set[str]:
        resp = client.get(f"{GITHUB_API}/repos/{owner}/{repo}/contents?ref={branch}")
        if resp.status_code != 200:
            return set()
        return {entry["name"] for entry in resp.json() if isinstance(entry, dict)}

    # ------------------------------------------------------------------ #
    # Analysis
    # ------------------------------------------------------------------ #
    def _analyze(
        self, request: CaptureRequest, files: dict[str, str], root_names: set[str]
    ) -> CapturedInput:
        warnings: list[str] = []
        dependencies = self._collect_dependencies(files)
        py_version = self._extract_python_version(files)

        tech = request.technology_type or self._infer_technology(dependencies, root_names, files)
        current_version = self._infer_current_version(tech, dependencies, py_version, files, warnings)
        integrations = self._infer_integrations(dependencies, root_names, files)

        target_version = request.target_version or "latest (unspecified)"
        if not request.target_version:
            warnings.append("No target_version provided; set one for a precise version-jump assessment.")
        if not dependencies:
            warnings.append("No dependencies detected; assessment will rely on version/config signals only.")

        return CapturedInput(
            technology_type=tech,
            current_version=current_version,
            target_version=target_version,
            dependencies=dependencies[:50],
            integrations=integrations,
            environment=request.environment,
            detected_from=sorted(files.keys()),
            warnings=warnings,
            source_type=request.source_type,
            location=request.location,
        )

    def _collect_dependencies(self, files: dict[str, str]) -> list[str]:
        deps: list[str] = []
        if "requirements.txt" in files:
            deps.extend(self._parse_requirements(files["requirements.txt"]))
        if "pyproject.toml" in files:
            deps.extend(self._parse_pyproject(files["pyproject.toml"]))
        if "Pipfile" in files:
            deps.extend(self._parse_pipfile(files["Pipfile"]))
        # De-duplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for d in deps:
            key = d.lower()
            if key not in seen:
                seen.add(key)
                unique.append(d)
        return unique

    @staticmethod
    def _parse_requirements(text: str) -> list[str]:
        deps: list[str] = []
        for raw in text.splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            line = line.split("#", 1)[0].strip()
            if line:
                deps.append(line)
        return deps

    @staticmethod
    def _parse_pyproject(text: str) -> list[str]:
        deps: list[str] = []
        if tomllib is not None:
            try:
                data = tomllib.loads(text)
                project = data.get("project", {})
                for d in project.get("dependencies", []) or []:
                    deps.append(str(d))
                poetry = data.get("tool", {}).get("poetry", {}).get("dependencies", {})
                for name, spec in poetry.items():
                    if name.lower() == "python":
                        continue
                    deps.append(name if not isinstance(spec, str) else f"{name}{spec}")
                return deps
            except Exception as exc:  # noqa: BLE001
                logger.warning("pyproject.toml parse failed, falling back: %s", exc)
        # Regex fallback: capture the dependencies = [ ... ] array
        m = re.search(r"dependencies\s*=\s*\[(.*?)\]", text, re.DOTALL)
        if m:
            for item in re.findall(r'["\']([^"\']+)["\']', m.group(1)):
                deps.append(item)
        return deps

    @staticmethod
    def _parse_pipfile(text: str) -> list[str]:
        deps: list[str] = []
        in_packages = False
        for raw in text.splitlines():
            line = raw.strip()
            if line.startswith("["):
                in_packages = line.lower() == "[packages]"
                continue
            if in_packages and "=" in line:
                name = line.split("=", 1)[0].strip().strip('"')
                if name:
                    deps.append(name)
        return deps

    @staticmethod
    def _extract_python_version(files: dict[str, str]) -> str | None:
        if ".python-version" in files:
            m = re.search(r"(\d+\.\d+(?:\.\d+)?)", files[".python-version"])
            if m:
                return m.group(1)
        if "runtime.txt" in files:
            m = re.search(r"python-(\d+\.\d+(?:\.\d+)?)", files["runtime.txt"], re.IGNORECASE)
            if m:
                return m.group(1)
        for key in ("pyproject.toml", "setup.cfg"):
            if key in files:
                m = re.search(r"(?:requires-python|python_requires)\s*=\s*[\"']?[>=~^ ]*(\d+\.\d+)", files[key])
                if m:
                    return m.group(1)
        if "Pipfile" in files:
            m = re.search(r"python_version\s*=\s*[\"'](\d+\.\d+)", files["Pipfile"])
            if m:
                return m.group(1)
        return None

    @staticmethod
    def _find_dep_version(dependencies: list[str], pkg: str) -> str | None:
        pat = re.compile(rf"^{re.escape(pkg)}\s*[=~><!]{{1,2}}\s*([0-9][^,;\s]*)", re.IGNORECASE)
        for dep in dependencies:
            m = pat.match(dep.strip())
            if m:
                return m.group(1)
        return None

    def _infer_technology(
        self, dependencies: list[str], root_names: set[str], files: dict[str, str]
    ) -> TechnologyType:
        dep_blob = " ".join(dependencies).lower()

        # MWAA / Airflow
        if "apache-airflow" in dep_blob or "dags" in {n.lower() for n in root_names}:
            return TechnologyType.MWAA
        # EMR / Spark
        if any(k in dep_blob for k in ("pyspark", "findspark", "emr")):
            return TechnologyType.EMR
        # Database (from docker-compose images)
        compose = files.get("docker-compose.yml", "") + files.get("docker-compose.yaml", "")
        if "alembic.ini" in files or re.search(r"(postgres|mysql|mariadb)\s*:", compose, re.IGNORECASE):
            return TechnologyType.DATABASE
        # Default
        return TechnologyType.PYTHON

    def _infer_current_version(
        self,
        tech: TechnologyType,
        dependencies: list[str],
        py_version: str | None,
        files: dict[str, str],
        warnings: list[str],
    ) -> str:
        if tech == TechnologyType.MWAA:
            v = self._find_dep_version(dependencies, "apache-airflow")
            if v:
                return f"Airflow {v}"
            warnings.append("Could not detect Airflow version from requirements; confirm the MWAA/Airflow version.")
            return f"Airflow (unknown, Python {py_version})" if py_version else "Airflow (unknown)"

        if tech == TechnologyType.EMR:
            v = self._find_dep_version(dependencies, "pyspark")
            if v:
                return f"Spark {v}"
            warnings.append("Could not detect Spark version; confirm the EMR release label.")
            return "EMR (unknown)"

        if tech == TechnologyType.DATABASE:
            compose = files.get("docker-compose.yml", "") + files.get("docker-compose.yaml", "")
            m = re.search(r"(postgres|mysql|mariadb)\s*:\s*[\"']?([0-9]+(?:\.[0-9]+)*)", compose, re.IGNORECASE)
            if m:
                engine = "PostgreSQL" if m.group(1).lower() == "postgres" else m.group(1).capitalize()
                return f"{engine} {m.group(2)}"
            warnings.append("Could not detect database version; confirm the engine and version.")
            return "Database (unknown)"

        # Python
        if py_version:
            return f"Python {py_version}"
        warnings.append("Could not detect Python version; add a .python-version or runtime.txt file.")
        return "Python (unknown)"

    @staticmethod
    def _infer_integrations(
        dependencies: list[str], root_names: set[str], files: dict[str, str]
    ) -> list[str]:
        dep_blob = " ".join(dependencies).lower()
        integrations: list[str] = []

        if "apache-airflow" in dep_blob or "dags" in {n.lower() for n in root_names}:
            integrations.append("Airflow DAGs")
        if "pyspark" in dep_blob or "findspark" in dep_blob:
            integrations.append("Spark jobs")
        if any(k in dep_blob for k in ("boto3", "botocore", "aws")):
            integrations.append("AWS services")
        if any(k in dep_blob for k in ("psycopg", "sqlalchemy", "asyncpg", "mysqlclient")):
            integrations.append("Database layer")
        if any(k in dep_blob for k in ("fastapi", "flask", "django", "uvicorn", "gunicorn")):
            integrations.append("Web/API service")
        if "docker-compose.yml" in files or "docker-compose.yaml" in files:
            integrations.append("Containerized services")

        # De-duplicate, preserve order
        seen: set[str] = set()
        result: list[str] = []
        for i in integrations:
            if i not in seen:
                seen.add(i)
                result.append(i)
        return result
