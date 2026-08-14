"""Data classes for the final scan output: result, risk flags, and graph."""

from dataclasses import dataclass, field

from .dependency import Dependency


@dataclass
class RiskFlag:
    """A deterministic risk flag raised by the risk tagger (no LLM)."""

    component: str
    reason: str

    def to_dict(self) -> dict:
        return {"component": self.component, "reason": self.reason}


@dataclass
class Consumer:
    """A detected consuming component of the repository.

    Represents one service/module discovered in the repo (usually one per
    manifest file), tagged with its language, how it connects (protocol), and
    the team that owns it. This is what enables cross-team / cross-language
    integration risk analysis directly from a scan.
    """

    name: str
    consumer_technology: str
    protocol: str | None = None
    owner_team: str | None = None
    source: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "consumer_technology": self.consumer_technology,
            "protocol": self.protocol,
            "owner_team": self.owner_team,
            "source": self.source,
        }


@dataclass
class GraphNode:
    """A node in the dependency graph."""

    id: str
    type: str  # "source" | "package" | "database"

    def to_dict(self) -> dict:
        return {"id": self.id, "type": self.type}


@dataclass
class GraphEdge:
    """A directed edge in the dependency graph (source → target)."""

    source: str
    target: str

    def to_dict(self) -> dict:
        return {"from": self.source, "to": self.target}


@dataclass
class ScanResult:
    """The complete output of a repository scan.

    This is the JSON contract that the Dependency Analyzer consumes.
    """

    repository: str
    languages: dict[str, int] = field(default_factory=dict)
    dependencies: list[Dependency] = field(default_factory=list)
    database: str = ""
    risk_flags: list[RiskFlag] = field(default_factory=list)
    graph_nodes: list[GraphNode] = field(default_factory=list)
    graph_edges: list[GraphEdge] = field(default_factory=list)
    consumers: list[Consumer] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "repository": self.repository,
            "languages": self.languages,
            "dependencies": [d.to_dict() for d in self.dependencies],
            "database": self.database,
            "risk_flags": [r.to_dict() for r in self.risk_flags],
            "consumers": [c.to_dict() for c in self.consumers],
            "dependency_graph": {
                "nodes": [n.to_dict() for n in self.graph_nodes],
                "edges": [e.to_dict() for e in self.graph_edges],
            },
        }
