import { motion } from "framer-motion";
import { Bot, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/utils/cn";
import type { AgentSummary } from "@/types";

interface AgentCardProps {
  agent: AgentSummary;
  onClick?: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const isHealthy = agent.status === "healthy";
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card onClick={onClick} className="cursor-pointer p-4">
        <div className="mb-3 flex items-center justify-between">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              isHealthy ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            )}
          >
            <Bot className="h-4 w-4" />
          </div>
          <StatusBadge status={agent.status} />
        </div>
        <div className="mb-0.5 text-sm font-extrabold">{agent.name}</div>
        <div className="mb-3 text-[11px] text-muted-foreground">{agent.role}</div>

        <div className="mb-2.5 grid grid-cols-2 gap-2">
          <Stat label="Requests" value={agent.requestsProcessed.toLocaleString()} />
          <Stat label="Latency" value={`${agent.latencyMs}ms`} />
          <Stat label="Errors" value={agent.errors} warn={agent.errors > 5} />
          <Stat label="Uptime" value={agent.uptime} />
        </div>

        <div className="flex items-start gap-1.5 rounded-lg bg-secondary px-2.5 py-2 text-[11px] text-muted-foreground">
          <Activity className="mt-0.5 h-3 w-3 flex-shrink-0" />
          {agent.currentTask}
        </div>
      </Card>
    </motion.div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary px-2.5 py-1.5">
      <div className="text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-[13px] font-bold", warn && "text-destructive")}>{value}</div>
    </div>
  );
}
