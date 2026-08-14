export type ID = string;

export type KnowledgeType =
  | "pdf"
  | "video"
  | "runbook"
  | "faq"
  | "architecture"
  | "transcript";

export type IndexStatus = "active" | "processing" | "needs_review" | "failed";
export type EmbeddingStatus = "complete" | "in_progress" | "failed" | "queued";

export interface KnowledgeItem {
  id: ID;
  title: string;
  type: KnowledgeType;
  sme: string;
  uploadedAt: string;
  tags: string[];
  status: IndexStatus;
  embeddingStatus: EmbeddingStatus;
  lastIndexedAt: string | null;
  sizeLabel?: string;
}

export interface UploadJob {
  id: ID;
  fileName: string;
  type: KnowledgeType;
  sizeLabel: string;
  stage: UploadStage;
  progress: number;
}

export type UploadStage =
  | "uploaded"
  | "extracted"
  | "chunked"
  | "embedded"
  | "indexed"
  | "ready";

export type ChatRole = "user" | "atlas";

export interface Citation {
  id: ID;
  title: string;
  type: KnowledgeType;
  locator: string;
}

export interface ChatMessage {
  id: ID;
  role: ChatRole;
  content: string;
  timestamp: string;
  confidence?: number;
  citations?: Citation[];
  followups?: string[];
  /** Backend feedback row id for thumbs up/down persistence */
  feedbackId?: number;
}

export interface Conversation {
  id: ID;
  user: string;
  topic: string;
  confidence: number;
  primaryDocument: string;
  updatedAt: string;
  messageCount: number;
}

export type AgentStatus = "healthy" | "degraded" | "offline";

export interface AgentSummary {
  id: ID;
  name: string;
  role: string;
  status: AgentStatus;
  requestsProcessed: number;
  latencyMs: number;
  errors: number;
  uptime: string;
  currentTask: string;
}

export type PipelineStageStatus = "done" | "active" | "queued" | "idle";

export interface PipelineStage {
  id: ID;
  name: string;
  status: PipelineStageStatus;
  durationLabel: string;
  recordsLabel: string;
}

export interface MetricSummary {
  id: ID;
  label: string;
  value: string;
  deltaLabel?: string;
  trend?: "up" | "down" | "flat";
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

export interface MultiSeriesPoint {
  label: string;
  [seriesKey: string]: string | number;
}

export interface ActivityEvent {
  id: ID;
  actor: string;
  action: string;
  timestamp: string;
  kind: "upload" | "reindex" | "feedback" | "alert" | "session";
}

export type GraphNodeType = "document" | "topic" | "sme" | "video" | "runbook" | "faq";

export interface GraphNode {
  id: ID;
  label: string;
  type: GraphNodeType;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: ID;
  target: ID;
}

export type UserRole = "knowledge_admin" | "sme_contributor" | "viewer";
export type UserStatus = "active" | "invited" | "suspended";

export interface WorkspaceUser {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActive: string | null;
}

export interface ModelServiceStatus {
  id: ID;
  name: string;
  detail: string;
  online: boolean;
}

export interface LogEntry {
  id: ID;
  timestamp: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
}

/** App-level auth role — distinct from WorkspaceUser["role"] which is a Knowledge-repo permission tier. */
export type AppRole = "admin" | "user";
