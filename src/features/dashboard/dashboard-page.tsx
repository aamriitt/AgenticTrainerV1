import { FileText, Video, MessagesSquare, Gauge, Users, UploadCloud, RefreshCw, Library } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/common/metric-card";
import { RecentActivity } from "@/components/common/recent-activity";
import { PipelineFlow } from "@/components/pipeline/pipeline-node";
import { ChartShell, TrendAreaChart, TrendLineChart, RankedBarChart } from "@/components/charts/analytics-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { AtlasLogoMark } from "@/components/branding/atlas-logo";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { usePipelineStages } from "@/features/pipeline/use-pipeline-stages";
import { useAuth } from "@/contexts/auth-context";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { metrics, questionsPerDay, confidenceTrend, knowledgeGrowth, mostAccessed, activity } = useDashboardData();
  const { data: stages } = usePipelineStages();

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-[18px] border border-border bg-gradient-to-br from-atlas-indigo/10 via-atlas-blue/10 to-atlas-emerald/10 p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-1.5 text-xs font-bold text-primary">Welcome back, {user?.name?.split(" ")[0] ?? "there"}</p>
            <h2 className="mb-1.5 text-[22px] font-extrabold tracking-tight">Atlas has your SME knowledge 91% retrieval-ready</h2>
            <p className="max-w-[520px] text-[13px] text-muted-foreground">
              1,284 documents and 162 videos are indexed across 37 sources. 3 items need re-indexing after last night&apos;s uploads.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-32 w-32 flex-shrink-0 flex-col items-center justify-center rounded-full border border-border bg-card shadow-lg"
          >
            <AtlasLogoMark tone="color" size={26} className="mb-1" />
            <div className="text-2xl font-extrabold text-primary">91</div>
            <div className="text-[10px] font-bold text-muted-foreground">HEALTH SCORE</div>
          </motion.div>
        </div>
        <div className="mt-6">
          {stages ? <PipelineFlow stages={stages} /> : <Skeleton className="h-24 w-full" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.isLoading || !metrics.data
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)
          : metrics.data.map((m, i) => (
              <MetricCard
                key={m.id}
                metric={m}
                icon={[FileText, Video, MessagesSquare, Gauge, Users][i % 5]}
                tone={(["indigo", "blue", "emerald", "amber", "indigo"] as const)[i % 5]}
              />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <ChartShell title="Questions asked per day" subtitle="Last 7 days">
          {questionsPerDay.data ? <TrendAreaChart data={questionsPerDay.data} color="hsl(243 75% 59%)" /> : <Skeleton className="h-[200px]" />}
        </ChartShell>
        <ChartShell title="Confidence score trend" subtitle="6-week average">
          {confidenceTrend.data ? <TrendLineChart data={confidenceTrend.data} domain={[70, 100]} color="hsl(158 84% 32%)" /> : <Skeleton className="h-[200px]" />}
        </ChartShell>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <ChartShell title="Most accessed documents" subtitle="By retrievals">
          {mostAccessed.data ? <RankedBarChart data={mostAccessed.data} color="hsl(217 91% 55%)" /> : <Skeleton className="h-[200px]" />}
        </ChartShell>
        <ChartShell title="Knowledge growth" subtitle="Documents and videos indexed over time">
          {knowledgeGrowth.data ? (
            <TrendAreaChart data={knowledgeGrowth.data as unknown as Array<Record<string, string | number>>} dataKey="documents" color="hsl(243 75% 59%)" />
          ) : (
            <Skeleton className="h-[200px]" />
          )}
        </ChartShell>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-[14.5px] font-bold">Recent activity</h3>
            {activity.data ? <RecentActivity events={activity.data} /> : <Skeleton className="h-40" />}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-[14.5px] font-bold">Quick actions</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction icon={UploadCloud} label="Upload knowledge" onClick={() => navigate("/upload")} />
              <QuickAction icon={MessagesSquare} label="Ask Atlas" onClick={() => navigate("/atlas")} />
              <QuickAction icon={Library} label="View sources" onClick={() => navigate("/repository")} />
              {user?.role === "admin" ? (
                <QuickAction icon={RefreshCw} label="Reindex database" onClick={() => navigate("/pipeline")} />
              ) : (
                <QuickAction icon={RefreshCw} label="Conversation history" onClick={() => navigate("/history")} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof UploadCloud; label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick} className="h-auto flex-col items-start gap-2.5 rounded-xl p-3.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-indigo/10 text-atlas-indigo">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-bold">{label}</span>
    </Button>
  );
}
