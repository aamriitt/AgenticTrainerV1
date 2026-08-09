import { useState, useMemo } from "react";
import { X, Bot, RefreshCw, Power, Filter, Search, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AgentCard } from "@/components/agents/agent-card";
import { StatusBadge } from "@/components/common/status-badge";
import { SearchBar } from "@/components/common/search-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgents } from "@/hooks/use-agents";
import { useToast } from "@/contexts/toast-context";
import type { AgentSummary } from "@/types";

export function AgentMonitorPage() {
  const { toast } = useToast();
  const { data: agents, isLoading } = useAgents();

  const [selected, setSelected] = useState<AgentSummary | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "healthy" | "degraded" | "offline">("all");

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    return agents.filter((a) => {
      const matchesQuery = a.name.toLowerCase().includes(query.toLowerCase()) || a.role.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [agents, query, statusFilter]);

  const handleRestartAgent = (agent: AgentSummary) => {
    toast({
      title: `Restarting ${agent.name}`,
      description: "Agent process restarted cleanly. Re-establishing LangGraph context.",
      type: "success",
    });
    setSelected(null);
  };

  const handleToggleAgentState = (agent: AgentSummary) => {
    toast({
      title: `${agent.name} status updated`,
      description: `Toggled status for ${agent.name}.`,
      type: "info",
    });
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-atlas-indigo" /> Autonomous Agent Network
          </h2>
          <p className="text-xs text-muted-foreground">Monitor state, token context, latency, and throughput of active LangGraph agents</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={query} onChange={setQuery} placeholder="Search agent name or role…" className="w-[240px]" />

          <div className="flex rounded-xl border border-border bg-card p-1 text-xs font-semibold">
            {(["all", "healthy", "degraded"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  statusFilter === st ? "bg-primary text-primary-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading || !agents
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)
          : filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onClick={() => setSelected(agent)} />
            ))}
      </div>

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-[480px] rounded-2xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden"
            >
              <div className="mb-4 flex items-start justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-extrabold text-foreground">{selected.name}</div>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{selected.role}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <DetailStat label="Requests processed" value={selected.requestsProcessed.toLocaleString()} />
                <DetailStat label="Avg latency" value={`${selected.latencyMs}ms`} />
                <DetailStat label="Errors (24h)" value={selected.errors} warn={selected.errors > 5} />
                <DetailStat label="Uptime" value={selected.uptime} />
              </div>

              <div className="mb-1.5 text-xs font-bold text-muted-foreground">Current Agent Task</div>
              <div className="mb-4 rounded-xl border border-border bg-secondary/50 p-3 text-[13px] font-medium text-foreground">
                {selected.currentTask}
              </div>

              <div className="mb-1.5 text-xs font-bold text-muted-foreground">Recent Agent Log Trace</div>
              <div className="mb-5 space-y-1.5 rounded-xl bg-slate-900 p-3.5 font-mono text-[11px] leading-relaxed text-emerald-300">
                <div>[10:41:02] received task from Orchestrator agent</div>
                <div>[10:41:02] context window loaded (4,096 tokens)</div>
                <div>[10:41:03] task completed cleanly • {selected.latencyMs}ms</div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button
                  variant="secondary"
                  onClick={() => handleToggleAgentState(selected)}
                  className="flex-1 rounded-xl gap-2 text-xs"
                >
                  <Power className="h-3.5 w-3.5" /> Toggle Pause
                </Button>
                <Button
                  onClick={() => handleRestartAgent(selected)}
                  className="flex-1 rounded-xl gap-2 text-xs shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Restart Agent
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailStat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 px-3.5 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-base font-extrabold ${warn ? "text-destructive" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
