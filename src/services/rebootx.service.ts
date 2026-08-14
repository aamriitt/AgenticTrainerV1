import { apiRequest, getAccessToken, getApiBaseUrl } from "./api-client";
import type { RebootxAssessment, RebootxUpgradeRequest } from "@/types";

export interface RebootxStatus {
  status: string;
  knowledge_documents: number;
  analysis_mode: string;
  llm: {
    available: boolean;
    model: string;
    detail: string;
  };
}

export interface ScanAndAssessResponse {
  scan_result: {
    languages?: Record<string, number>;
    database?: string;
    dependencies?: Array<{ name: string; version?: string | null }>;
    risk_flags?: Array<{ component: string; reason: string }>;
    consumers?: Array<{ name: string; consumer_technology?: string; protocol?: string }>;
  };
  upgrade_request: RebootxUpgradeRequest;
  assessment: RebootxAssessment;
}

export const rebootxService = {
  status: () => apiRequest<RebootxStatus>("/rebootx/status"),

  assess: (body: RebootxUpgradeRequest) =>
    apiRequest<RebootxAssessment>("/rebootx/assess", { method: "POST", body }),

  scanAndAssess: (body: { repo_path: string; target_version: string; current_version?: string; environment?: string }) =>
    apiRequest<ScanAndAssessResponse>("/rebootx/scan-and-assess", { method: "POST", body }),

  downloadReport: async (assessment: RebootxAssessment, format: "html" | "pdf") => {
    const token = getAccessToken();
    const res = await fetch(`${getApiBaseUrl()}/rebootx/report?format=${format}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(assessment),
    });
    if (!res.ok) {
      throw new Error(`Report failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "pdf" ? "rebootx-readiness.pdf" : "rebootx-readiness.html";
    a.click();
    URL.revokeObjectURL(url);
  },
};
