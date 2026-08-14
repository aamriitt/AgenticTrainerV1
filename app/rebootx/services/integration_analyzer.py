"""Deep, non-trivial integration risk analysis.

The goal is to move beyond "N integrations may be affected" and surface the
risks that actually bite during enterprise upgrades:

  * per-consumer driver/client compatibility (a Java JDBC consumer and a
    Python psycopg2 consumer break differently on the same DB upgrade),
  * protocol/contract risks (REST serialization, gRPC stubs, Kafka schemas,
    shared data files), and
  * the cross-cutting coordination risk when a single change is consumed by
    multiple teams across multiple languages with independent release cycles.
"""

from __future__ import annotations

from app.rebootx.schemas import IdentifiedRisk, IntegrationDetail, RiskLevel, TechnologyType

# --------------------------------------------------------------------------- #
# Normalization
# --------------------------------------------------------------------------- #
_TECH_ALIASES = {
    "java": "java", "jvm": "java", "kotlin": "java", "scala": "scala", "spark": "scala",
    "python": "python", "py": "python",
    "dotnet": "dotnet", ".net": "dotnet", "csharp": "dotnet", "c#": "dotnet",
    "node": "nodejs", "nodejs": "nodejs", "node.js": "nodejs", "javascript": "nodejs", "typescript": "nodejs",
    "go": "go", "golang": "go",
    "ruby": "ruby", "php": "php", "rust": "rust",
}

_PROTOCOL_ALIASES = {
    "jdbc": "jdbc", "odbc": "odbc",
    "psycopg2": "psycopg2", "psycopg": "psycopg2", "psycopg3": "psycopg2",
    "npgsql": "npgsql", "pg": "pg", "node-postgres": "pg", "pgx": "pgx", "lib/pq": "pgx",
    "rest": "rest", "http": "rest", "api": "rest", "graphql": "rest",
    "grpc": "grpc", "protobuf": "grpc", "proto": "grpc",
    "kafka": "kafka", "event": "kafka", "events": "kafka", "streaming": "kafka",
    "parquet": "file", "avro": "file", "orc": "file", "file": "file", "s3": "file",
    "shared-database": "shared-db", "shared-db": "shared-db", "shared database": "shared-db",
    "soap": "rest",
}


def _norm(value: str | None, table: dict[str, str]) -> str | None:
    if not value:
        return None
    return table.get(value.strip().lower())


# --------------------------------------------------------------------------- #
# Database driver/client compatibility matrix
# --------------------------------------------------------------------------- #
# keyed by normalized consumer technology (for database upgrades)
_DB_DRIVER_RISKS: dict[str, dict] = {
    "java": {
        "level": RiskLevel.HIGH,
        "title": "Java (JDBC) consumer driver compatibility",
        "explanation": (
            "Java consumers connect via the PostgreSQL JDBC driver (pgjdbc). Drivers older than "
            "42.2.5 fail SCRAM-SHA-256 authentication, and pre-42.5 builds may not negotiate modern "
            "TLS defaults introduced in newer server versions. The driver is bundled per-application, "
            "so every Java service must be rebuilt and redeployed with an updated pgjdbc."
        ),
        "recommendation": "Upgrade pgjdbc to 42.5+ in each Java consumer; verify SCRAM auth and TLS in staging.",
    },
    "python": {
        "level": RiskLevel.HIGH,
        "title": "Python (psycopg2) consumer driver compatibility",
        "explanation": (
            "Python consumers using psycopg2 older than 2.9.3 fail SCRAM-SHA-256 auth against newer "
            "PostgreSQL servers and may error on SSL negotiation. psycopg2-binary wheels must also be "
            "rebuilt for the deployment platform. Consider migrating to psycopg3 for async and better "
            "protocol support."
        ),
        "recommendation": "Pin psycopg2>=2.9.3 (or psycopg3) and re-test connection pooling and SSL settings.",
    },
    "dotnet": {
        "level": RiskLevel.HIGH,
        "title": ".NET (Npgsql/ODBC) consumer driver compatibility",
        "explanation": (
            ".NET consumers use Npgsql or psqlODBC. Npgsql must match the server major version "
            "(6.0+ for PG15); older versions may mishandle new type representations and SCRAM auth. "
            "ODBC-based reporting tools need an updated psqlODBC driver to speak the new wire protocol."
        ),
        "recommendation": "Upgrade Npgsql/psqlODBC to a server-compatible version and validate report queries.",
    },
    "nodejs": {
        "level": RiskLevel.MEDIUM,
        "title": "Node.js (node-postgres) consumer driver compatibility",
        "explanation": (
            "Node.js consumers using node-postgres (pg) require version 8.x or newer for SASL/SCRAM "
            "authentication support. Older versions will fail to authenticate against newer servers."
        ),
        "recommendation": "Upgrade the 'pg' package to >=8.x and confirm SASL auth works end-to-end.",
    },
    "go": {
        "level": RiskLevel.MEDIUM,
        "title": "Go (pgx/lib-pq) consumer driver compatibility",
        "explanation": (
            "Go consumers using lib/pq (now in maintenance mode) may lag on protocol/auth support; "
            "pgx v5 is recommended. Verify SCRAM auth and prepared-statement behavior against the target server."
        ),
        "recommendation": "Migrate to pgx v5 (or verify lib/pq SCRAM support) and re-run integration tests.",
    },
    "scala": {
        "level": RiskLevel.HIGH,
        "title": "Scala/Spark (JDBC) consumer driver compatibility",
        "explanation": (
            "Spark/Scala jobs read via the JDBC data source; the pgjdbc driver is shipped inside the "
            "application/fat JAR on every executor. A stale bundled driver breaks SCRAM auth and can "
            "produce dialect mismatches against the upgraded server."
        ),
        "recommendation": "Rebuild the fat JAR with pgjdbc 42.5+ and validate the Spark JDBC dialect on a test cluster.",
    },
}

# --------------------------------------------------------------------------- #
# Protocol/contract risks (mostly technology-agnostic)
# --------------------------------------------------------------------------- #
_PROTOCOL_RISKS: dict[str, dict] = {
    "rest": {
        "level": RiskLevel.MEDIUM,
        "title": "REST contract / serialization risk",
        "explanation": (
            "REST consumers depend on the response contract. Upgrades often subtly change JSON "
            "serialization — date/timestamp formats, decimal precision, null vs. omitted fields, "
            "enum casing — which silently breaks consumers written in other languages that "
            "deserialize into strict types."
        ),
        "recommendation": "Run contract tests (e.g. Pact) and diff sample payloads before/after the upgrade.",
    },
    "grpc": {
        "level": RiskLevel.HIGH,
        "title": "gRPC / protobuf stub compatibility",
        "explanation": (
            "gRPC consumers depend on generated stubs from shared .proto definitions. A server-side "
            "library upgrade can change generated code, field presence semantics, or require a newer "
            "protobuf runtime — breaking consumers in other languages that were generated from an older toolchain."
        ),
        "recommendation": "Regenerate and version stubs for every consumer language; verify proto backward compatibility.",
    },
    "kafka": {
        "level": RiskLevel.HIGH,
        "title": "Kafka message schema compatibility",
        "explanation": (
            "Event/Kafka consumers depend on message schemas (Avro/Protobuf/JSON) and schema-registry "
            "compatibility. Producers and consumers upgrade on independent cycles; a serializer change "
            "can break cross-language consumers or violate registry compatibility rules."
        ),
        "recommendation": "Validate schema-registry compatibility mode and test each consumer against new-format messages.",
    },
    "file": {
        "level": RiskLevel.MEDIUM,
        "title": "Shared data-file (Parquet/Avro) schema evolution",
        "explanation": (
            "Data files written by the upgraded system (Parquet/Avro/ORC) may change schema, encoding, "
            "or type representation. Downstream readers in other languages/engines (e.g. pandas reading "
            "Spark output) must tolerate schema evolution or they fail on read."
        ),
        "recommendation": "Test cross-engine read/write with sample files and enforce a schema-evolution policy.",
    },
    "shared-db": {
        "level": RiskLevel.HIGH,
        "title": "Shared database — multi-owner contract",
        "explanation": (
            "Multiple services share this database. A schema or engine change is a shared contract that "
            "no single team fully owns; each dependent service may rely on specific behavior, extensions, "
            "or query plans that the upgrade alters."
        ),
        "recommendation": "Inventory all dependent services and require sign-off from each owner before cutover.",
    },
}


def _truncate(text: str, limit: int = 400) -> str:
    return text if len(text) <= limit else text[:limit] + "..."


def analyze_integrations(
    technology_type: TechnologyType,
    integration_details: list[IntegrationDetail],
    plain_integrations: list[str],
) -> list[IdentifiedRisk]:
    """Produce non-trivial integration risks from structured + plain integrations."""
    # Merge plain integration strings into lightly-inferred details.
    details: list[IntegrationDetail] = list(integration_details)
    for name in plain_integrations:
        if not any(d.name.lower() == name.lower() for d in details):
            details.append(_infer_detail_from_string(name))

    if not details:
        return []

    risks: list[IdentifiedRisk] = []
    seen_titles: set[str] = set()

    for detail in details:
        tech = _norm(detail.consumer_technology, _TECH_ALIASES)
        proto = _norm(detail.protocol, _PROTOCOL_ALIASES)
        label = detail.name + (f" [{detail.owner_team}]" if detail.owner_team else "")

        # Database driver compatibility (per consumer language)
        if technology_type == TechnologyType.DATABASE and tech in _DB_DRIVER_RISKS:
            base = _DB_DRIVER_RISKS[tech]
            title = f"{base['title']} — {detail.name}"
            if title not in seen_titles:
                seen_titles.add(title)
                risks.append(
                    IdentifiedRisk(
                        category="integration",
                        risk_level=base["level"],
                        title=title,
                        explanation=f"Consumer '{label}': {base['explanation']}",
                        recommendation=base["recommendation"],
                    )
                )

        # Protocol/contract risk
        if proto in _PROTOCOL_RISKS:
            base = _PROTOCOL_RISKS[proto]
            title = f"{base['title']} — {detail.name}"
            if title not in seen_titles:
                seen_titles.add(title)
                risks.append(
                    IdentifiedRisk(
                        category="integration",
                        risk_level=base["level"],
                        title=title,
                        explanation=f"Consumer '{label}': {base['explanation']}",
                        recommendation=base["recommendation"],
                    )
                )

        # Unknown consumer — still better than nothing, prompt for detail
        if tech is None and proto is None:
            title = f"Unspecified consumer profile — {detail.name}"
            if title not in seen_titles:
                seen_titles.add(title)
                risks.append(
                    IdentifiedRisk(
                        category="integration",
                        risk_level=RiskLevel.MEDIUM,
                        title=title,
                        explanation=(
                            f"Consumer '{label}' is connected but its language and protocol are unknown, "
                            "so client/driver and contract compatibility cannot be assessed precisely."
                        ),
                        recommendation="Capture the consumer's language and connection protocol for a deeper assessment.",
                    )
                )

    # Cross-cutting: heterogeneous multi-language consumers
    risks.extend(_cross_cutting_risks(details))
    return risks


def _cross_cutting_risks(details: list[IntegrationDetail]) -> list[IdentifiedRisk]:
    risks: list[IdentifiedRisk] = []
    languages = {
        _norm(d.consumer_technology, _TECH_ALIASES)
        for d in details
        if _norm(d.consumer_technology, _TECH_ALIASES)
    }
    teams = {d.owner_team for d in details if d.owner_team}

    if len(languages) >= 2:
        lang_list = ", ".join(sorted(languages))
        risks.append(
            IdentifiedRisk(
                category="integration",
                risk_level=RiskLevel.HIGH,
                title="Heterogeneous multi-language consumers",
                explanation=(
                    f"This system is consumed by {len(details)} integrations spanning {len(languages)} "
                    f"languages/stacks ({lang_list}). Each stack has an independent release cycle and its "
                    "own client/driver compatibility profile, so a single upgrade fans out into several "
                    "independently-owned changes that must all land before cutover."
                ),
                recommendation=(
                    "Coordinate a synchronized cutover: track per-consumer driver upgrades, run cross-team "
                    "integration tests, and gate the change on every consumer being validated."
                ),
            )
        )

    if len(teams) >= 2:
        risks.append(
            IdentifiedRisk(
                category="integration",
                risk_level=RiskLevel.MEDIUM,
                title="Cross-team coordination required",
                explanation=(
                    f"Consumers are owned by {len(teams)} different teams ({', '.join(sorted(teams))}). "
                    "Upgrade success depends on aligning multiple teams' priorities, release windows, and "
                    "rollback readiness — an organizational risk beyond the technical change itself."
                ),
                recommendation="Establish a shared cutover plan with named owners and a joint rollback trigger.",
            )
        )

    return risks


def _infer_detail_from_string(name: str) -> IntegrationDetail:
    """Best-effort inference of language/protocol from a free-text integration name."""
    lower = name.lower()
    tech = None
    proto = None
    for key, norm in _TECH_ALIASES.items():
        if key in lower:
            tech = norm
            break
    for key, norm in _PROTOCOL_ALIASES.items():
        if key in lower:
            proto = norm
            break
    return IntegrationDetail(name=name, consumer_technology=tech, protocol=proto)
