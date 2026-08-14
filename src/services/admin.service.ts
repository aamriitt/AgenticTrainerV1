import { apiRequest, mockRequest } from "./api-client";
import { MOCK_USERS, MOCK_LOGS } from "@/constants/mock-data";
import type { WorkspaceUser } from "@/types";

export interface PendingCorrection {
  id: number;
  created_at: string;
  question: string;
  answer: string;
  correction?: string | null;
  status: string;
  rating?: string | null;
}

export interface AnalyticsSummary {
  total_interactions: number;
  thumbs_up: number;
  thumbs_down: number;
  pending_review: number;
  vectors_stored?: number;
  top_questions?: Array<{ label: string; value: number }>;
}

export const adminService = {
  getUsers: () => mockRequest(MOCK_USERS),
  getLogs: () => mockRequest(MOCK_LOGS),

  getModelStatus: async () => {
    const health = await apiRequest<{
      status: string;
      vectors_stored: number;
      ollama_host?: string;
      ollama_model?: string;
    }>("/health", { auth: false });
    return [
      { id: "svc-api", name: "Agentic Trainer API", detail: health.status, online: health.status === "ok" },
      {
        id: "svc-ollama",
        name: "Ollama LLM",
        detail: health.ollama_model ?? "configured",
        online: Boolean(health.ollama_host),
      },
      {
        id: "svc-chroma",
        name: "ChromaDB",
        detail: `${health.vectors_stored ?? 0} vectors`,
        online: true,
      },
      { id: "svc-embed", name: "Embedding model", detail: "BAAI/bge-base-en-v1.5", online: true },
    ];
  },

  inviteUser: (input: { name: string; email: string; role: WorkspaceUser["role"] }): Promise<WorkspaceUser> =>
    mockRequest({
      id: `u-${Date.now()}`,
      name: input.name,
      email: input.email,
      role: input.role,
      status: "invited",
      lastActive: null,
    }),

  listPending: () => apiRequest<PendingCorrection[]>("/admin/pending"),

  approve: (id: number, sme_comments = "") =>
    apiRequest<{ status: string }>(`/admin/${id}/approve`, {
      method: "POST",
      body: { sme_comments, reviewed_by: "admin" },
    }),

  reject: (id: number, sme_comments = "") =>
    apiRequest<{ status: string }>(`/admin/${id}/reject`, {
      method: "POST",
      body: { sme_comments, reviewed_by: "admin" },
    }),

  reindexApproved: () =>
    apiRequest<{ corrections_reindexed: number }>("/admin/reindex", { method: "POST" }),

  getAnalytics: () => apiRequest<AnalyticsSummary>("/admin/analytics"),
};
