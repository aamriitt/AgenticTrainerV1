import { mockRequest } from "./api-client";
import {
  MOCK_DASHBOARD_METRICS, MOCK_QUESTIONS_PER_DAY, MOCK_CONFIDENCE_TREND,
  MOCK_KNOWLEDGE_GROWTH, MOCK_MOST_ACCESSED, MOCK_ACTIVITY,
} from "@/constants/mock-data";

export const dashboardService = {
  getMetrics: () => mockRequest(MOCK_DASHBOARD_METRICS),
  getQuestionsPerDay: () => mockRequest(MOCK_QUESTIONS_PER_DAY),
  getConfidenceTrend: () => mockRequest(MOCK_CONFIDENCE_TREND),
  getKnowledgeGrowth: () => mockRequest(MOCK_KNOWLEDGE_GROWTH),
  getMostAccessed: () => mockRequest(MOCK_MOST_ACCESSED),
  getRecentActivity: () => mockRequest(MOCK_ACTIVITY),
};
