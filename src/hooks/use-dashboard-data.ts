import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";

export function useDashboardData() {
  const metrics = useQuery({ queryKey: ["dashboard", "metrics"], queryFn: dashboardService.getMetrics });
  const questionsPerDay = useQuery({ queryKey: ["dashboard", "questions-per-day"], queryFn: dashboardService.getQuestionsPerDay });
  const confidenceTrend = useQuery({ queryKey: ["dashboard", "confidence-trend"], queryFn: dashboardService.getConfidenceTrend });
  const knowledgeGrowth = useQuery({ queryKey: ["dashboard", "knowledge-growth"], queryFn: dashboardService.getKnowledgeGrowth });
  const mostAccessed = useQuery({ queryKey: ["dashboard", "most-accessed"], queryFn: dashboardService.getMostAccessed });
  const activity = useQuery({ queryKey: ["dashboard", "activity"], queryFn: dashboardService.getRecentActivity });

  return {
    metrics, questionsPerDay, confidenceTrend, knowledgeGrowth, mostAccessed, activity,
    isLoading: metrics.isLoading || questionsPerDay.isLoading || confidenceTrend.isLoading,
  };
}
