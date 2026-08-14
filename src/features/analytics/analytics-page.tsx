import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, Search, Clock, AlertTriangle, Download, Calendar, Sparkles } from "lucide-react";
import { analyticsService } from "@/services/analytics.service";
import { ChartShell, TrendLineChart, RankedBarChart, DistributionPieChart } from "@/components/charts/analytics-chart";
import { MetricCard } from "@/components/common/metric-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";

export function AnalyticsPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const summary = useQuery({ queryKey: ["analytics", "summary"], queryFn: analyticsService.getSummary });
  const topQuestions = useQuery({ queryKey: ["analytics", "top-questions"], queryFn: analyticsService.getTopQuestions });
  const feedback = useQuery({ queryKey: ["analytics", "feedback"], queryFn: analyticsService.getFeedbackDistribution });
  const retrievalTrend = useQuery({ queryKey: ["analytics", "retrieval-trend"], queryFn: analyticsService.getRetrievalAccuracyTrend });
  const agentLatency = useQuery({ queryKey: ["analytics", "agent-latency"], queryFn: analyticsService.getAgentLatencies });
  const docUsage = useQuery({ queryKey: ["analytics", "doc-usage"], queryFn: analyticsService.getDocumentUsage });
  const confidenceDist = useQuery({ queryKey: ["analytics", "confidence-dist"], queryFn: analyticsService.getConfidenceDistribution });

  const maxTopQuestion = Math.max(...(topQuestions.data?.map((q) => q.value) ?? [1]), 1);

  const handleExport = () => {
    toast({
      title: "Exporting analytics report",
      description: `CSV summary generated for timeframe: ${timeRange}.`,
      type: "success",
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-atlas-indigo" /> Analytics & Knowledge Grounding Performance
          </h2>
          <p className="text-xs text-muted-foreground">Comprehensive insights into retrieval accuracy, SME feedback, and query latency</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex rounded-xl border border-border bg-card p-1 text-xs font-semibold">
            {(["7d", "30d", "90d"] as const).map((tr) => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`px-3 py-1 rounded-lg uppercase transition-all ${
                  timeRange === tr ? "bg-primary text-primary-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tr}
              </button>
            ))}
          </div>

          <Button onClick={handleExport} className="rounded-xl gap-2 shadow-sm">
            <Download className="h-3.5 w-3.5" /> Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartShell title="Top SME Questions Asked" subtitle={`Most frequent queries (${timeRange})`}>
          {topQuestions.data ? (
            <div className="flex flex-col gap-3">
              {topQuestions.data.map((q) => (
                <div key={q.label}>
                  <div className="mb-1 flex justify-between text-[12.5px]">
                    <span className="font-semibold text-foreground">{q.label}</span>
                    <span className="text-xs font-mono text-muted-foreground">{q.value} queries</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary/80 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(q.value / maxTopQuestion) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton className="h-40 rounded-xl" />
          )}
        </ChartShell>

        <ChartShell title="User Feedback Rating Distribution" subtitle="Ratings submitted on Atlas responses">
          {feedback.data ? <DistributionPieChart data={feedback.data} /> : <Skeleton className="h-40 rounded-xl" />}
        </ChartShell>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartShell title="Retrieval Accuracy Trend" subtitle="Weekly vector precision score (%)">
          {retrievalTrend.data ? <TrendLineChart data={retrievalTrend.data} domain={[70, 100]} color="hsl(217 91% 55%)" /> : <Skeleton className="h-[200px] rounded-xl" />}
        </ChartShell>

        <ChartShell title="Agent Processing Latency" subtitle="Average latency by autonomous agent (ms)">
          {agentLatency.data ? <RankedBarChart data={agentLatency.data} horizontal={false} color="hsl(243 75% 59%)" /> : <Skeleton className="h-[200px] rounded-xl" />}
        </ChartShell>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartShell title="Document Usage & Citations" subtitle="Retrieval counts by knowledge source">
          {docUsage.data ? <RankedBarChart data={docUsage.data} color="hsl(158 84% 32%)" /> : <Skeleton className="h-[200px] rounded-xl" />}
        </ChartShell>

        <ChartShell title="Answer Confidence Breakdown" subtitle="Distribution of confidence scores">
          {confidenceDist.data ? <RankedBarChart data={confidenceDist.data} horizontal={false} color="hsl(32 94% 43%)" /> : <Skeleton className="h-[200px] rounded-xl" />}
        </ChartShell>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <MetricCard
          metric={{
            id: "interactions",
            label: "Total interactions",
            value: String(summary.data?.total_interactions ?? "—"),
          }}
          icon={Layers}
          tone="indigo"
        />
        <MetricCard
          metric={{
            id: "thumbs-up",
            label: "Thumbs up",
            value: String(summary.data?.thumbs_up ?? "—"),
          }}
          icon={Search}
          tone="emerald"
        />
        <MetricCard
          metric={{
            id: "vectors",
            label: "Vectors stored",
            value: String(summary.data?.vectors_stored ?? "—"),
          }}
          icon={Clock}
          tone="blue"
        />
        <MetricCard
          metric={{
            id: "pending",
            label: "Pending SME review",
            value: String(summary.data?.pending_review ?? "—"),
            deltaLabel: `${summary.data?.thumbs_down ?? 0} thumbs down`,
            trend: "down",
          }}
          icon={AlertTriangle}
          tone="amber"
        />
      </div>
    </div>
  );
}
