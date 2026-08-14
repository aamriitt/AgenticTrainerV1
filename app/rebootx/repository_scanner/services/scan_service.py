"""Scan Service — The orchestrator that chains all scanner components.

This is the ONLY file the outside world calls. It runs each component
in order and assembles the final ScanResult.

Pipeline:
    discover_files → classify → extract_all → detect_database
    → tag_risks → build_graph → ScanResult
"""

from pathlib import Path

from app.rebootx.repository_scanner.scanner.traversal import discover_files
from app.rebootx.repository_scanner.scanner.classifier import classify
from app.rebootx.repository_scanner.scanner.extractor import extract_all
from app.rebootx.repository_scanner.scanner.db_detector import detect_database
from app.rebootx.repository_scanner.scanner.risk_tagger import tag_risks
from app.rebootx.repository_scanner.scanner.graph_builder import build_graph
from app.rebootx.repository_scanner.scanner.consumer_detector import detect_consumers, POSTGRES_PROTOCOLS
from app.rebootx.repository_scanner.models.scan_result import ScanResult


def scan(repo_path: str) -> ScanResult:
    """Run the full repository scan pipeline.

    Args:
        repo_path: Path to the repository to scan.

    Returns:
        ScanResult containing languages, dependencies, database,
        risk flags, and the dependency graph.
    """
    # Step 1: Discover all files in the repo
    files = discover_files(repo_path)

    # Step 2: Classify each file by language
    files = classify(files)

    # Step 3: Extract dependencies (requirements.txt + AST imports)
    dependencies = extract_all(files)

    # Step 4: Detect database technology
    database = detect_database(dependencies)

    # Step 5: Detect multi-team / multi-language consumers
    consumers = detect_consumers(files, repo_path)

    # If the Python-driver check missed it, infer PostgreSQL from consumer protocols
    if not database and any(c.protocol in POSTGRES_PROTOCOLS for c in consumers):
        database = "PostgreSQL"

    # Step 6: Apply deterministic risk rules
    risk_flags = tag_risks(dependencies, database)

    # Step 7: Build the dependency graph
    graph_nodes, graph_edges = build_graph(files, dependencies, database)

    # Step 8: Count languages (exclude non-source categories)
    lang_counts: dict[str, int] = {}
    non_source = {"Other", "Config", "Documentation", "Git", "Docker", "Docker Compose", "Make"}
    for f in files:
        if f.language and f.language not in non_source:
            # Normalize: "Python (deps)" → "Python", "Python (config)" → "Python"
            lang = f.language.split(" (")[0]
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

    # Assemble the final result
    return ScanResult(
        repository=Path(repo_path).resolve().name,
        languages=lang_counts,
        dependencies=dependencies,
        database=database,
        risk_flags=risk_flags,
        graph_nodes=graph_nodes,
        graph_edges=graph_edges,
        consumers=consumers,
    )
