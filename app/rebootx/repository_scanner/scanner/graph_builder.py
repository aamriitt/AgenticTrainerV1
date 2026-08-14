"""Component 6: Dependency Graph Builder — Build a directed graph of dependencies.

Input:  Classified files (with imports), dependencies, detected database
Output: list[GraphNode], list[GraphEdge]

The graph connects:  source file → local module → external package → database

This is the KEY OUTPUT for the Dependency Analyzer module downstream.
It enables impact analysis: "If psycopg2 breaks, what files are affected?"
"""

import sys

from app.rebootx.repository_scanner.models.file_info import FileInfo
from app.rebootx.repository_scanner.models.dependency import Dependency
from app.rebootx.repository_scanner.models.scan_result import GraphNode, GraphEdge

# Python standard library modules to exclude from the graph.
# This is a subset — covers the most commonly imported ones.
PYTHON_STDLIB = {
    "abc", "argparse", "ast", "asyncio", "base64", "builtins",
    "collections", "configparser", "contextlib", "copy", "csv",
    "dataclasses", "datetime", "decimal", "difflib", "email",
    "enum", "errno", "fileinput", "fnmatch", "functools",
    "glob", "gzip", "hashlib", "heapq", "hmac", "html", "http",
    "importlib", "inspect", "io", "itertools", "json", "logging",
    "math", "multiprocessing", "operator", "os", "pathlib",
    "pickle", "platform", "pprint", "queue", "random", "re",
    "shutil", "signal", "socket", "sqlite3", "statistics",
    "string", "struct", "subprocess", "sys", "tempfile",
    "textwrap", "threading", "time", "timeit", "typing",
    "unittest", "urllib", "uuid", "warnings", "xml", "zipfile",
}

# PostgreSQL driver packages — these get edges to the "PostgreSQL" node
PG_DRIVER_PACKAGES = {"psycopg2", "psycopg2_binary", "psycopg", "asyncpg", "aiopg", "pg8000"}


def build_graph(
    files: list[FileInfo],
    dependencies: list[Dependency],
    database: str,
) -> tuple[list[GraphNode], list[GraphEdge]]:
    """Build a dependency graph from scan results.

    Args:
        files: Classified FileInfo objects with imports populated.
        dependencies: All discovered dependencies.
        database: Detected database (e.g., "PostgreSQL").

    Returns:
        Tuple of (nodes, edges) representing the directed dependency graph.
    """
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    seen_nodes: set[str] = set()

    # Build a set of local Python module names for distinguishing local vs external
    local_modules: dict[str, str] = {}  # module_name → relative_path
    for f in files:
        if f.is_python:
            local_modules[f.module_name] = f.relative_path

    # Build a set of known external dependency names
    dep_names = {d.name.lower().replace("-", "_") for d in dependencies}

    # Process each Python file
    for f in files:
        if not f.is_python or not f.imports:
            continue

        # Add this source file as a node
        if f.relative_path not in seen_nodes:
            nodes.append(GraphNode(id=f.relative_path, type="source"))
            seen_nodes.add(f.relative_path)

        for imp in f.imports:
            # Skip standard library
            if imp in PYTHON_STDLIB:
                continue

            imp_lower = imp.lower().replace("-", "_")

            if imp in local_modules:
                # Local module → connect to the actual file
                target_path = local_modules[imp]

                if target_path not in seen_nodes:
                    nodes.append(GraphNode(id=target_path, type="source"))
                    seen_nodes.add(target_path)

                # Don't add self-edges
                if f.relative_path != target_path:
                    edges.append(GraphEdge(source=f.relative_path, target=target_path))

            elif imp_lower in dep_names:
                # External package
                if imp not in seen_nodes:
                    nodes.append(GraphNode(id=imp, type="package"))
                    seen_nodes.add(imp)

                edges.append(GraphEdge(source=f.relative_path, target=imp))

    # Add database node and connect PG drivers to it
    if database:
        nodes.append(GraphNode(id=database, type="database"))
        seen_nodes.add(database)

        for driver in PG_DRIVER_PACKAGES:
            if driver in seen_nodes:
                edges.append(GraphEdge(source=driver, target=database))

    return nodes, edges
