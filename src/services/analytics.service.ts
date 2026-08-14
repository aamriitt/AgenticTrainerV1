import { apiRequest, mockRequest } from "./api-client";
import {
  MOCK_CONFIDENCE_DISTRIBUTION,
  MOCK_CONFIDENCE_TREND,
  MOCK_AGENTS,
  MOCK_MOST_ACCESSED,
} from "@/constants/mock-data";
import type { AnalyticsSummary } from "./admin.service";

async function summary(): Promise<AnalyticsSummary> {
  return apiRequest<AnalyticsSummary>("/admin/analytics");
}

export const analyticsService = {
  getSummary: summary,

  getTopQuestions: async () => {
    const data = await summary();
    return data.top_questions?.length
      ? data.top_questions
      : [{ label: "No questions logged yet", value: 0 }];
  },

  getFeedbackDistribution: async () => {
    const data = await summary();
    return [
      { label: "Thumbs up", value: data.thumbs_up ?? 0 },
      { label: "Thumbs down", value: data.thumbs_down ?? 0 },
      { label: "Pending SME", value: data.pending_review ?? 0 },
    ];
  },

  getConfidenceDistribution: () => mockRequest(MOCK_CONFIDENCE_DISTRIBUTION),
  getRetrievalAccuracyTrend: () => mockRequest(MOCK_CONFIDENCE_TREND),
  getAgentLatencies: () => mockRequest(MOCK_AGENTS.map((a) => ({ label: a.name.replace(" Agent", ""), value: a.latencyMs }))),
  getDocumentUsage: () => mockRequest(MOCK_MOST_ACCESSED),
};
