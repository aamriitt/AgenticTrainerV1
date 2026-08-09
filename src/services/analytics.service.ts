import { mockRequest } from "./api-client";
import {
  MOCK_TOP_QUESTIONS, MOCK_FEEDBACK_DISTRIBUTION, MOCK_CONFIDENCE_DISTRIBUTION,
  MOCK_CONFIDENCE_TREND, MOCK_AGENTS, MOCK_MOST_ACCESSED,
} from "@/constants/mock-data";

export const analyticsService = {
  getTopQuestions: () => mockRequest(MOCK_TOP_QUESTIONS),
  getFeedbackDistribution: () => mockRequest(MOCK_FEEDBACK_DISTRIBUTION),
  getConfidenceDistribution: () => mockRequest(MOCK_CONFIDENCE_DISTRIBUTION),
  getRetrievalAccuracyTrend: () => mockRequest(MOCK_CONFIDENCE_TREND),
  getAgentLatencies: () => mockRequest(MOCK_AGENTS.map((a) => ({ label: a.name.replace(" Agent", ""), value: a.latencyMs }))),
  getDocumentUsage: () => mockRequest(MOCK_MOST_ACCESSED),
};
