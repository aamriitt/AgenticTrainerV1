"""Component 1: File Discovery — Walk the repository and list all files.

Input:  Repository path (string)
Output: list[FileInfo] — every file in the repo, with path and extension filled in.

This is the first step in the scanner pipeline.
"""

from pathlib import Path

from app.rebootx.repository_scanner.models.file_info import FileInfo

# Directories to skip — these never contain meaningful source code
IGNORE_DIRS = {
    ".git",
    "venv",
    ".venv",
    "env",
    ".env",
    "node_modules",
    "__pycache__",
    ".idea",
    ".vscode",
    ".mypy_cache",
    ".pytest_cache",
    ".tox",
    "dist",
    "build",
    "chroma_data",
    "*.egg-info",
}


def discover_files(repo_path: str) -> list[FileInfo]:
    """Recursively walk the repository and return all files as FileInfo objects.

    Args:
        repo_path: Absolute or relative path to the repository root.

    Returns:
        List of FileInfo objects, one per file. Each has path, relative_path,
        and extension filled in. language and imports are empty at this stage.
    """
    root = Path(repo_path).resolve()

    if not root.is_dir():
        raise ValueError(f"Repository path does not exist or is not a directory: {repo_path}")

    files: list[FileInfo] = []

    for item in root.rglob("*"):
        # Skip files inside ignored directories
        if _should_ignore(item, root):
            continue

        if item.is_file():
            files.append(
                FileInfo(
                    path=item,
                    relative_path=str(item.relative_to(root)),
                    extension=item.suffix.lower(),
                )
            )

    return files


def _should_ignore(path: Path, root: Path) -> bool:
    """Check if a path falls under any ignored directory."""
    relative = path.relative_to(root)
    for part in relative.parts:
        if part in IGNORE_DIRS:
            return True
        # Handle glob pattern for egg-info
        if part.endswith(".egg-info"):
            return True
    return False
