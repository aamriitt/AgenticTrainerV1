import { useState } from "react";
import { Terminal, RefreshCw, Filter, Pause, Play, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PipelineFlow, PipelineNode } from "@/components/pipeline/pipeline-node";
import { PipelineStageModal } from "@/components/pipeline/pipeline-stage-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipelineStages } from "./use-pipeline-stages";
import { useToast } from "@/contexts/toast-context";
import type { PipelineStage } from "@/types";

const INITIAL_LOGS = [
  { id: "1", level: "info", time: "10:41:03", msg: "Embedding batch 4/7 completed cleanly (6,820 vectors generated)." },
  { id: "2", level: "info", time: "10:40:58", msg: "Whisper audio transcription completed for 'incident-response-KT.mp4' (184 MB)." },
  { id: "3", level: "warn", time: "10:39:12", msg: "Chunk overlap boundary auto-adjusted from 45 to 50 tokens for optimal embedding density." },
  { id: "4", level: "info", time: "10:38:05", msg: "ChromaDB vector collection 'sme_knowledge_v3' flushed to disk." },
  { id: "5", level: "error", time: "10:35:40", msg: "Retried document chunking for doc-7 (transcript parsing transient error)." },
];

export function PipelineMonitorPage() {
  const { toast } = useToast();
  const { data: stages } = usePipelineStages();

  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [isStreaming, setIsStreaming] = useState(true);
  const [logs, setLogs] = useState(INITIAL_LOGS);

  const handleSyncPipeline = () => {
    toast({
      title: "Pipeline sync initiated",
      description: "Triggered end-to-end vector sync across all 1,284 knowledge items.",
      type: "success",
    });
  };

  const handleClearLogs = () => {
    setLogs([]);
    toast({
      title: "Terminal cleared",
      description: "Pipeline log console reset.",
      type: "info",
    });
  };

  const filteredLogs = logs.filter((l) => logFilter === "all" || l.level === logFilter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-foreground">Pipeline & Ingestion Architecture</h2>
          <p className="text-xs text-muted-foreground">Monitor automated chunking, Whisper transcription, and ChromaDB vector indexing</p>
        </div>
        <Button onClick={handleSyncPipeline} className="rounded-xl gap-2 shadow-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Trigger Pipeline Sync
        </Button>
      </div>

      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14.5px] font-bold text-foreground">Live Retrieval Pipeline Stages</h3>
            <span className="text-xs text-muted-foreground">Click any node to inspect batch throughput</span>
          </div>
          <p className="mb-5 text-xs text-muted-foreground">
            Documents → Whisper transcription → Cleaning → Chunking → Embedding model → ChromaDB → Retriever → Response
          </p>
          {stages ? <PipelineFlow stages={stages} /> : <Skeleton className="h-24 w-full" />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {stages
          ? stages.map((stage) => (
              <div
                key={stage.id}
                onClick={() => setSelectedStage(stage)}
                className="flex flex-col gap-2 cursor-pointer group"
              >
                <PipelineNode stage={stage} />
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 px-3 py-2 font-mono text-[10.5px] text-emerald-300 transition-all group-hover:border-primary/50 border border-transparent">
                  <span className="flex items-center gap-1.5 truncate">
                    <Terminal className="h-3 w-3 flex-shrink-0" />
                    {stage.status === "done"
                      ? "[OK] completed cleanly"
                      : stage.status === "active"
                      ? "[RUNNING] batch 4/7"
                      : "[QUEUED] waiting upstream"}
                  </span>
                </div>
              </div>
            ))
          : Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>

      <Card className="border border-border/80 bg-slate-950 overflow-hidden shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">Live Infrastructure Console Log</span>
            <span className={`h-2 w-2 rounded-full ${isStreaming ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-800 p-0.5 text-[11px]">
              {(["all", "info", "warn", "error"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-all ${
                    logFilter === lvl ? "bg-primary text-primary-foreground" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsStreaming((prev) => !prev)}
              className="h-7 w-7 text-slate-400 hover:text-slate-200"
              title={isStreaming ? "Pause Log Stream" : "Resume Log Stream"}
            >
              {isStreaming ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearLogs}
              className="h-7 w-7 text-slate-400 hover:text-slate-200"
              title="Clear Terminal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="p-4 font-mono text-[11.5px] leading-relaxed space-y-2 max-h-[260px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 italic py-4 text-center">No logs matching active filter.</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-slate-500 flex-shrink-0">[{log.time}]</span>
                <span className={`font-bold uppercase flex-shrink-0 w-12 ${
                  log.level === "info" ? "text-emerald-400" : log.level === "warn" ? "text-amber-400" : "text-rose-400"
                }`}>
                  [{log.level}]
                </span>
                <span className="text-slate-300">{log.msg}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      <PipelineStageModal
        stage={selectedStage}
        onClose={() => setSelectedStage(null)}
      />
    </div>
  );
}
