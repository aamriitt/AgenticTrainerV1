"""Component 7: Consumer Detector — detect multi-team, multi-language consumers.

Where the earlier components answer "what is this repo made of?", this one
answers "who consumes the thing being upgraded, in what language, over what
protocol, and which team owns it?" — the signal needed for cross-team /
cross-language integration risk analysis.

It works by treating each *manifest file* (pom.xml, build.sbt, *.csproj,
requirements.txt, package.json, go.mod, ...) as the root of a component, then:

  * infers the component's language from the manifest type,
  * infers the connection protocol from driver/library keywords in the manifest
    and a bounded sample of the component's source files, and
  * resolves the owning team from a CODEOWNERS file (falling back to the
    component directory name).

Input:  list[FileInfo], repo_path
Output: list[Consumer]
"""

from __future__ import annotations

import fnmatch
from pathlib import Path

from app.rebootx.repository_scanner.models.file_info import FileInfo
from app.rebootx.repository_scanner.models.scan_result import Consumer

# Manifest filename → language
MANIFEST_LANGUAGE = {
    "pom.xml": "java",
    "build.gradle": "java",
    "build.gradle.kts": "java",
    "build.sbt": "scala",
    "package.json": "nodejs",
    "go.mod": "go",
    "Gemfile": "ruby",
    "requirements.txt": "python",
    "pyproject.toml": "python",
    "Pipfile": "python",
    "setup.py": "python",
}

# Manifest by extension → language
MANIFEST_EXT_LANGUAGE = {
    ".csproj": "dotnet",
    ".fsproj": "dotnet",
    ".sln": "dotnet",
}

# Source file extensions per language (used to sample source for protocol hints)
SOURCE_EXTENSIONS = {
    "java": {".java", ".kt"},
    "scala": {".scala"},
    "dotnet": {".cs", ".fs"},
    "python": {".py"},
    "nodejs": {".js", ".jsx", ".ts", ".tsx"},
    "go": {".go"},
    "ruby": {".rb"},
}

# Protocols that imply a PostgreSQL database consumer
POSTGRES_PROTOCOLS = {"JDBC", "psycopg2", "asyncpg", "Npgsql", "ODBC", "pg", "pgx"}

_MAX_SOURCE_FILES = 20  # cap per component to keep scans fast


def detect_consumers(files: list[FileInfo], repo_path: str) -> list[Consumer]:
    """Detect per-component consumers (language + protocol + owning team)."""
    repo_name = Path(repo_path).resolve().name

    # 1) Identify component roots from manifest files: {rel_dir: language}
    roots: dict[str, str] = {}
    for f in files:
        lang = MANIFEST_LANGUAGE.get(f.path.name) or MANIFEST_EXT_LANGUAGE.get(f.extension)
        if not lang:
            continue
        rel_dir = _posix_dir(f.relative_path)
        # First manifest wins; prefer a non-python language if a dir is polyglot
        if rel_dir not in roots or (roots[rel_dir] == "python" and lang != "python"):
            roots[rel_dir] = lang

    if not roots:
        return []

    # 2) Assign every file to its nearest (deepest) component root
    root_dirs_deepest_first = sorted(roots.keys(), key=lambda d: len(d), reverse=True)
    comp_files: dict[str, list[FileInfo]] = {d: [] for d in roots}
    for f in files:
        rp = f.relative_path.replace("\\", "/")
        for d in root_dirs_deepest_first:
            if d == "" or rp == d or rp.startswith(d + "/"):
                comp_files[d].append(f)
                break

    # 3) Parse CODEOWNERS once (ordered list of (pattern, team))
    codeowners = _parse_codeowners(files)

    # 4) Build a Consumer per component
    consumers: list[Consumer] = []
    for rel_dir, lang in sorted(roots.items()):
        text = _gather_component_text(rel_dir, lang, comp_files[rel_dir])
        protocol = _detect_protocol(lang, text)
        team = _match_team(codeowners, rel_dir) or _fallback_team(rel_dir, repo_name)
        name = _component_name(rel_dir, repo_name)
        consumers.append(
            Consumer(
                name=name,
                consumer_technology=lang,
                protocol=protocol,
                owner_team=team,
                source=rel_dir or ".",
            )
        )

    return consumers


# --------------------------------------------------------------------------- #
# Protocol detection
# --------------------------------------------------------------------------- #
def _detect_protocol(language: str, text: str) -> str | None:
    """Infer the connection/consumption protocol from manifest + source text."""
    t = text.lower()

    if language == "java":
        if "postgresql" in t or "pgjdbc" in t or "org.postgresql" in t or "jdbc:postgresql" in t:
            return "JDBC"
        if "kafka" in t:
            return "Kafka"
        if "spring-web" in t or "spring-boot-starter-web" in t or "jax-rs" in t or "javax.ws.rs" in t:
            return "REST"
    elif language == "scala":
        if "kafka" in t:
            return "Kafka"
        if "postgresql" in t or "spark" in t or "jdbc:postgresql" in t:
            return "JDBC"
        if "akka-http" in t or "http4s" in t or "play" in t:
            return "REST"
    elif language == "dotnet":
        if "npgsql" in t:
            return "Npgsql"
        if "system.data.odbc" in t or "odbc" in t:
            return "ODBC"
        if "confluent.kafka" in t or "kafka" in t:
            return "Kafka"
        if "aspnetcore" in t or "microsoft.aspnet" in t:
            return "REST"
    elif language == "python":
        if "psycopg" in t:
            return "psycopg2"
        if "asyncpg" in t:
            return "asyncpg"
        if "kafka" in t:
            return "Kafka"
        if "fastapi" in t or "flask" in t or "django" in t:
            return "REST"
    elif language == "nodejs":
        if "kafkajs" in t or "kafka" in t:
            return "Kafka"
        if '"pg"' in t or "node-postgres" in t or "postgres" in t:
            return "pg"
        if "express" in t or "fastify" in t or "@nestjs" in t:
            return "REST"
    elif language == "go":
        if "pgx" in t or "lib/pq" in t or "postgres" in t:
            return "pgx"
        if "sarama" in t or "kafka" in t:
            return "Kafka"
    return None


def _gather_component_text(rel_dir: str, language: str, files: list[FileInfo]) -> str:
    """Read manifest(s) + a bounded sample of source files for keyword hints."""
    chunks: list[str] = []
    source_exts = SOURCE_EXTENSIONS.get(language, set())
    source_count = 0

    for f in files:
        is_manifest = f.path.name in MANIFEST_LANGUAGE or f.extension in MANIFEST_EXT_LANGUAGE
        is_source = f.extension in source_exts and source_count < _MAX_SOURCE_FILES
        if not (is_manifest or is_source):
            continue
        try:
            chunks.append(f.path.read_text(encoding="utf-8", errors="ignore"))
        except OSError:
            continue
        if is_source:
            source_count += 1

    return "\n".join(chunks)


# --------------------------------------------------------------------------- #
# CODEOWNERS parsing / matching
# --------------------------------------------------------------------------- #
def _parse_codeowners(files: list[FileInfo]) -> list[tuple[str, str]]:
    """Parse the first CODEOWNERS file into an ordered list of (pattern, team)."""
    codeowners_file = next((f for f in files if f.path.name.upper() == "CODEOWNERS"), None)
    if not codeowners_file:
        return []

    try:
        lines = codeowners_file.path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return []

    entries: list[tuple[str, str]] = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        pattern, owners = parts[0], parts[1:]
        entries.append((pattern, _team_from_owner(owners[0])))
    return entries


def _team_from_owner(owner: str) -> str:
    """Turn a CODEOWNERS owner into a readable team name.

    "@rebootx/data-engineering" -> "Data Engineering"
    "@claims"                   -> "Claims"
    "team@corp.com"             -> "Team"
    """
    owner = owner.lstrip("@")
    if "/" in owner:
        owner = owner.split("/", 1)[1]
    owner = owner.split("@")[0]  # drop email domain if present
    return owner.replace("-", " ").replace("_", " ").strip().title()


def _match_team(entries: list[tuple[str, str]], rel_dir: str) -> str | None:
    """Return the team for a component dir; last matching CODEOWNERS rule wins."""
    matched: str | None = None
    for pattern, team in entries:
        if _codeowners_match(pattern, rel_dir):
            matched = team  # last match wins, per CODEOWNERS semantics
    return matched


def _codeowners_match(pattern: str, path: str) -> bool:
    """Approximate CODEOWNERS matching for a directory path."""
    p = pattern.strip()
    if p in ("*", "/*"):
        return True
    core = p[1:] if p.startswith("/") else p  # leading '/' anchors to root
    core = core.rstrip("/")
    if not core:
        return True
    # Directory-prefix match (e.g. "services/claims" matches "services/claims/api")
    if path == core or path.startswith(core + "/"):
        return True
    # Wildcard patterns (e.g. "services/*")
    return fnmatch.fnmatch(path, core) or fnmatch.fnmatch(path, core + "/*")


# --------------------------------------------------------------------------- #
# Naming helpers
# --------------------------------------------------------------------------- #
def _posix_dir(relative_path: str) -> str:
    rp = relative_path.replace("\\", "/")
    return rp.rsplit("/", 1)[0] if "/" in rp else ""


def _titleize(segment: str) -> str:
    return segment.replace("-", " ").replace("_", " ").strip().title()


def _component_name(rel_dir: str, repo_name: str) -> str:
    if not rel_dir:
        return _titleize(repo_name)
    return _titleize(rel_dir.rsplit("/", 1)[-1])


def _fallback_team(rel_dir: str, repo_name: str) -> str:
    if not rel_dir:
        return _titleize(repo_name)
    # Use the top-level directory as a team proxy when CODEOWNERS is absent
    return _titleize(rel_dir.split("/")[-1])
