import type {
  KnowledgeItem, UploadJob, ChatMessage, Conversation, AgentSummary,
  PipelineStage, MetricSummary, TimeSeriesPoint, MultiSeriesPoint,
  ActivityEvent, GraphNode, GraphEdge, WorkspaceUser, ModelServiceStatus, LogEntry,
} from "@/types";

export const MOCK_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  { id: "doc-1", title: "Customer Billing Pipeline v3.pdf", type: "pdf", sme: "Priya Sharma", uploadedAt: "2026-08-04T09:10:00Z", tags: ["billing", "etl"], status: "active", embeddingStatus: "complete", lastIndexedAt: "2026-08-06T08:00:00Z" },
  { id: "doc-2", title: "Glue Job Runbook", type: "runbook", sme: "Arun Verma", uploadedAt: "2026-08-03T09:10:00Z", tags: ["glue", "ops"], status: "active", embeddingStatus: "complete", lastIndexedAt: "2026-08-06T03:00:00Z" },
  { id: "doc-3", title: "KT Session 4 — Auth & Billing", type: "video", sme: "Daniel Osei", uploadedAt: "2026-08-02T09:10:00Z", tags: ["auth", "kt"], status: "active", embeddingStatus: "complete", lastIndexedAt: "2026-08-05T08:00:00Z" },
  { id: "doc-4", title: "Architecture Overview 2026", type: "architecture", sme: "Mei Lin", uploadedAt: "2026-07-30T09:10:00Z", tags: ["architecture"], status: "processing", embeddingStatus: "in_progress", lastIndexedAt: null },
  { id: "doc-5", title: "Incident Response SOP", type: "runbook", sme: "Arun Verma", uploadedAt: "2026-07-28T09:10:00Z", tags: ["incident", "sop"], status: "active", embeddingStatus: "complete", lastIndexedAt: "2026-08-03T08:00:00Z" },
  { id: "doc-6", title: "Onboarding FAQ — Platform Team", type: "faq", sme: "Priya Sharma", uploadedAt: "2026-07-24T09:10:00Z", tags: ["onboarding"], status: "active", embeddingStatus: "complete", lastIndexedAt: "2026-07-31T08:00:00Z" },
  { id: "doc-7", title: "KT Session 2 — Data Pipeline", type: "transcript", sme: "Mei Lin", uploadedAt: "2026-07-20T09:10:00Z", tags: ["data", "kt"], status: "needs_review", embeddingStatus: "failed", lastIndexedAt: null },
  { id: "doc-8", title: "VPC Networking Runbook", type: "runbook", sme: "Arun Verma", uploadedAt: "2026-07-18T09:10:00Z", tags: ["network"], status: "active", embeddingStatus: "complete", lastIndexedAt: "2026-07-28T08:00:00Z" },
];

export const MOCK_UPLOAD_JOBS: UploadJob[] = [
  { id: "up-1", fileName: "Q3-billing-runbook.pdf", type: "pdf", sizeLabel: "2.4 MB", stage: "ready", progress: 100 },
  { id: "up-2", fileName: "incident-response-KT.mp4", type: "video", sizeLabel: "184 MB", stage: "chunked", progress: 55 },
  { id: "up-3", fileName: "vpc-networking-transcript.docx", type: "transcript", sizeLabel: "88 KB", stage: "indexed", progress: 92 },
];

export const MOCK_CHAT_SEED: ChatMessage[] = [
  { id: "m-1", role: "user", content: "Explain the Customer Billing Pipeline", timestamp: "2026-08-06T10:41:00Z" },
  {
    id: "m-2",
    role: "atlas",
    content:
      "The Customer Billing Pipeline ingests raw usage events from Kinesis, normalizes them through a Glue ETL job, then writes aggregated line items to the billing warehouse before Stripe invoice generation runs nightly at 01:00 UTC. Reconciliation checks run against the previous day's ledger to catch drift before invoices go out.",
    timestamp: "2026-08-06T10:41:20Z",
    confidence: 92,
    citations: [
      { id: "c-1", title: "Customer Billing Pipeline v3.pdf", type: "pdf", locator: "p. 4–6" },
      { id: "c-2", title: "Glue Job Runbook", type: "runbook", locator: "§2 Ingestion" },
      { id: "c-3", title: "KT Session 4 — Auth & Billing", type: "video", locator: "18:22" },
    ],
    followups: [
      "What happens if the Glue job fails mid-run?",
      "How is reconciliation drift alerted?",
      "Who owns the nightly invoice job?",
    ],
  },
];

export const SUGGESTED_PROMPTS = [
  "Explain the Customer Billing Pipeline",
  "Summarize KT Session 4",
  "What changed in the latest architecture?",
  "How do Glue Jobs work?",
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  { id: "conv-1", user: "Priya Sharma", topic: "Customer Billing Pipeline", confidence: 92, primaryDocument: "Customer Billing Pipeline v3.pdf", updatedAt: "2026-08-06T10:41:00Z", messageCount: 6 },
  { id: "conv-2", user: "Daniel Osei", topic: "Glue Job retry policy", confidence: 88, primaryDocument: "Glue Job Runbook", updatedAt: "2026-08-06T09:12:00Z", messageCount: 4 },
  { id: "conv-3", user: "Mei Lin", topic: "VPC peering timeout", confidence: 54, primaryDocument: "VPC Networking Runbook", updatedAt: "2026-08-05T16:55:00Z", messageCount: 9 },
  { id: "conv-4", user: "Arun Verma", topic: "Incident escalation path", confidence: 90, primaryDocument: "Incident Response SOP", updatedAt: "2026-08-05T14:20:00Z", messageCount: 3 },
  { id: "conv-5", user: "Priya Sharma", topic: "Stripe invoice reconciliation", confidence: 81, primaryDocument: "Customer Billing Pipeline v3.pdf", updatedAt: "2026-08-04T11:03:00Z", messageCount: 5 },
];

export const MOCK_AGENTS: AgentSummary[] = [
  { id: "agent-orchestrator", name: "Orchestrator Agent", role: "Routing & coordination", status: "healthy", requestsProcessed: 12402, latencyMs: 84, errors: 0, uptime: "99.98%", currentTask: "Routing 'Glue job retry policy' to Retrieval Agent" },
  { id: "agent-intent", name: "Intent Agent", role: "Query classification", status: "healthy", requestsProcessed: 12402, latencyMs: 31, errors: 0, uptime: "99.97%", currentTask: "Classifying intent: procedural lookup" },
  { id: "agent-retrieval", name: "Retrieval Agent", role: "Vector search", status: "healthy", requestsProcessed: 11988, latencyMs: 142, errors: 2, uptime: "99.91%", currentTask: "Querying ChromaDB (k=8, filter: runbooks)" },
  { id: "agent-reasoning", name: "Reasoning Agent", role: "Answer synthesis", status: "degraded", requestsProcessed: 11742, latencyMs: 612, errors: 14, uptime: "99.40%", currentTask: "Synthesizing multi-source answer" },
  { id: "agent-citation", name: "Citation Agent", role: "Source attribution", status: "healthy", requestsProcessed: 11742, latencyMs: 58, errors: 0, uptime: "99.99%", currentTask: "Mapping response spans to source chunks" },
  { id: "agent-memory", name: "Memory Agent", role: "Session context", status: "healthy", requestsProcessed: 12402, latencyMs: 22, errors: 0, uptime: "99.99%", currentTask: "Persisting session context" },
];

export const MOCK_PIPELINE_STAGES: PipelineStage[] = [
  { id: "stage-1", name: "Documents", status: "done", durationLabel: "0.4s", recordsLabel: "1,284" },
  { id: "stage-2", name: "Whisper transcription", status: "done", durationLabel: "3m 12s", recordsLabel: "162" },
  { id: "stage-3", name: "Cleaning", status: "done", durationLabel: "1.1s", recordsLabel: "1,446" },
  { id: "stage-4", name: "Chunking", status: "done", durationLabel: "2.3s", recordsLabel: "48,204" },
  { id: "stage-5", name: "Embedding model", status: "done", durationLabel: "18.4s", recordsLabel: "48,204" },
  { id: "stage-6", name: "ChromaDB", status: "done", durationLabel: "2.1s", recordsLabel: "48,204" },
  { id: "stage-7", name: "Retriever", status: "done", durationLabel: "0.3s", recordsLabel: "hybrid BM25+vector" },
  { id: "stage-8", name: "Response", status: "done", durationLabel: "1.2s", recordsLabel: "grounded" },
];

export const MOCK_DASHBOARD_METRICS: MetricSummary[] = [
  { id: "metric-docs", label: "Documents indexed", value: "1,284", deltaLabel: "+42 this week", trend: "up" },
  { id: "metric-videos", label: "Training videos", value: "162", deltaLabel: "+8 this week", trend: "up" },
  { id: "metric-questions", label: "Questions asked", value: "8,206", deltaLabel: "+12.4%", trend: "up" },
  { id: "metric-confidence", label: "Avg. confidence", value: "88.4%", deltaLabel: "+3.1 pts", trend: "up" },
  { id: "metric-smes", label: "Total SMEs", value: "14", deltaLabel: "2 pending invite", trend: "flat" },
];

export const MOCK_QUESTIONS_PER_DAY: TimeSeriesPoint[] = [
  { label: "Mon", value: 128 }, { label: "Tue", value: 164 }, { label: "Wed", value: 149 },
  { label: "Thu", value: 201 }, { label: "Fri", value: 187 }, { label: "Sat", value: 62 }, { label: "Sun", value: 44 },
];

export const MOCK_CONFIDENCE_TREND: TimeSeriesPoint[] = [
  { label: "W1", value: 78 }, { label: "W2", value: 81 }, { label: "W3", value: 79 },
  { label: "W4", value: 85 }, { label: "W5", value: 88 }, { label: "W6", value: 91 },
];

export const MOCK_KNOWLEDGE_GROWTH: MultiSeriesPoint[] = [
  { label: "W1", documents: 120, videos: 18 }, { label: "W2", documents: 158, videos: 24 },
  { label: "W3", documents: 190, videos: 29 }, { label: "W4", documents: 246, videos: 35 },
  { label: "W5", documents: 289, videos: 41 }, { label: "W6", documents: 334, videos: 47 },
];

export const MOCK_MOST_ACCESSED: TimeSeriesPoint[] = [
  { label: "Billing Pipeline v3", value: 342 }, { label: "Glue Job Runbook", value: 298 },
  { label: "KT Session 4", value: 264 }, { label: "Architecture Overview", value: 231 }, { label: "Incident SOP", value: 198 },
];

export const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: "act-1", actor: "Priya Sharma", action: "uploaded Customer Billing Pipeline v3.pdf", timestamp: "2026-08-06T10:35:00Z", kind: "upload" },
  { id: "act-2", actor: "Atlas", action: "re-indexed 12 documents after Glue Job update", timestamp: "2026-08-06T10:19:00Z", kind: "reindex" },
  { id: "act-3", actor: "Daniel Osei", action: "answered a feedback thread on KT Session 4", timestamp: "2026-08-06T09:41:00Z", kind: "feedback" },
  { id: "act-4", actor: "Retrieval Agent", action: "flagged a low-confidence answer on 'VPC peering'", timestamp: "2026-08-06T08:41:00Z", kind: "alert" },
  { id: "act-5", actor: "Mei Lin", action: "recorded a new SME video: Incident Response walkthrough", timestamp: "2026-08-06T06:41:00Z", kind: "session" },
];

export const MOCK_GRAPH_NODES: GraphNode[] = [
  { id: "doc1", label: "Billing Pipeline v3", type: "document", x: 340, y: 90 },
  { id: "doc2", label: "Glue Job Runbook", type: "runbook", x: 150, y: 170 },
  { id: "doc3", label: "Architecture Overview", type: "document", x: 540, y: 160 },
  { id: "vid1", label: "KT Session 4", type: "video", x: 420, y: 260 },
  { id: "topic1", label: "Billing", type: "topic", x: 250, y: 260 },
  { id: "topic2", label: "Networking", type: "topic", x: 620, y: 300 },
  { id: "sme1", label: "Priya Sharma", type: "sme", x: 130, y: 330 },
  { id: "sme2", label: "Arun Verma", type: "sme", x: 60, y: 250 },
  { id: "faq1", label: "Onboarding FAQ", type: "faq", x: 480, y: 60 },
  { id: "doc4", label: "VPC Networking Runbook", type: "runbook", x: 700, y: 210 },
];

export const MOCK_GRAPH_EDGES: GraphEdge[] = [
  { source: "doc1", target: "topic1" }, { source: "doc2", target: "topic1" }, { source: "doc1", target: "sme1" },
  { source: "doc2", target: "sme2" }, { source: "vid1", target: "topic1" }, { source: "vid1", target: "doc1" },
  { source: "doc3", target: "topic2" }, { source: "doc4", target: "topic2" }, { source: "doc4", target: "sme2" },
  { source: "faq1", target: "doc3" }, { source: "topic1", target: "sme1" },
];

export const MOCK_USERS: WorkspaceUser[] = [
  { id: "u-1", name: "Priya Sharma", email: "priya.sharma@company.com", role: "sme_contributor", status: "active", lastActive: "2026-08-06T10:35:00Z" },
  { id: "u-2", name: "Daniel Osei", email: "daniel.osei@company.com", role: "sme_contributor", status: "active", lastActive: "2026-08-06T09:41:00Z" },
  { id: "u-3", name: "Mei Lin", email: "mei.lin@company.com", role: "sme_contributor", status: "active", lastActive: "2026-08-06T06:41:00Z" },
  { id: "u-4", name: "Arun Verma", email: "arun.verma@company.com", role: "knowledge_admin", status: "active", lastActive: "2026-08-06T01:41:00Z" },
  { id: "u-5", name: "Sara Kwan", email: "sara.kwan@company.com", role: "viewer", status: "invited", lastActive: null },
];

export const MOCK_MODEL_STATUS: ModelServiceStatus[] = [
  { id: "svc-1", name: "Reasoning model", detail: "Generation & synthesis", online: true },
  { id: "svc-2", name: "Vector store", detail: "ChromaDB", online: true },
  { id: "svc-3", name: "Embedding model", detail: "text-embedding-3", online: true },
  { id: "svc-4", name: "Transcription", detail: "Whisper", online: true },
  { id: "svc-5", name: "Agent orchestration", detail: "LangGraph workflow", online: true },
];

export const MOCK_LOGS: LogEntry[] = [
  { id: "log-1", timestamp: "2026-08-06T10:41:03Z", level: "info", source: "retrieval-agent", message: "query resolved in 142ms · confidence 92%" },
  { id: "log-2", timestamp: "2026-08-06T10:38:51Z", level: "warn", source: "reasoning-agent", message: "latency spike detected (612ms)" },
  { id: "log-3", timestamp: "2026-08-06T10:22:14Z", level: "info", source: "pipeline", message: "embedding batch 4/7 completed (6,820 vectors)" },
  { id: "log-4", timestamp: "2026-08-06T09:58:02Z", level: "info", source: "admin", message: "Arun Verma triggered a manual reindex" },
  { id: "log-5", timestamp: "2026-08-06T09:41:19Z", level: "error", source: "citation-agent", message: "source span mapping failed for doc-2291, retried" },
];

export const MOCK_TOP_QUESTIONS: TimeSeriesPoint[] = [
  { label: "How does the billing reconciliation job work?", value: 84 },
  { label: "What triggers a Glue job retry?", value: 71 },
  { label: "Where is the incident escalation runbook?", value: 63 },
  { label: "How do I request VPC peering?", value: 58 },
  { label: "What changed in the latest architecture?", value: 49 },
];

export const MOCK_FEEDBACK_DISTRIBUTION = [
  { label: "Helpful", value: 78 },
  { label: "Partially helpful", value: 15 },
  { label: "Not helpful", value: 7 },
];

export const MOCK_CONFIDENCE_DISTRIBUTION: TimeSeriesPoint[] = [
  { label: "90–100%", value: 412 }, { label: "75–89%", value: 528 }, { label: "50–74%", value: 210 }, { label: "<50%", value: 61 },
];
