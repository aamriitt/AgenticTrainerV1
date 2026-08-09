import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, X, Terminal, CheckCircle2, AlertTriangle, Play, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { useToast } from "@/contexts/toast-context";
import type { PipelineStage } from "@/types";

interface PipelineStageModalProps {
  stage: PipelineStage | null;
  onClose: () => void;
}

export function PipelineStageModal({ stage, onClose }: PipelineStageModalProps) {
  const { toast } = useToast();

  if (!stage) return null;

  const handleRestartStage = () => {
    toast({
      title: `Restarting ${stage.name}`,
      description: "Batch re-processing initiated for stage worker pool.",
      type: "info",
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/45 backdrop-blur-xs"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border pb-3.5 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-foreground">{stage.name} Stage</h3>
                  <StatusBadge status={stage.status === "done" ? "healthy" : stage.status === "active" ? "processing" : "queued"} />
                </div>
                <p className="text-xs text-muted-foreground">ID: #{stage.id}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3.5 bg-secondary/30">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Records Processed</div>
                <div className="text-sm font-extrabold text-foreground mt-0.5">{stage.recordsLabel}</div>
              </div>
              <div className="rounded-xl border border-border p-3.5 bg-secondary/30">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Stage Latency</div>
                <div className="text-sm font-extrabold text-foreground mt-0.5">{stage.durationLabel}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 bg-card space-y-2">
              <div className="text-xs font-bold text-foreground">Stage Configurations</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Chunk Size: <strong className="text-foreground">512 tokens</strong></div>
                <div>Chunk Overlap: <strong className="text-foreground">50 tokens</strong></div>
                <div>Worker Threads: <strong className="text-foreground">8 Workers</strong></div>
                <div>Memory Limit: <strong className="text-foreground">4 GB RAM</strong></div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-emerald-500" /> Stage Console Trace
              </div>
              <div className="rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-300 space-y-1">
                <div>[10:41:00] stage initialized with 8 parallel worker processes</div>
                <div>[10:41:02] batch chunking: {stage.recordsLabel} items ingested</div>
                <div>[10:41:03] {stage.status === "done" ? "[OK] verified vector schema integrity" : "[RUNNING] processing batch partition #4"}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={onClose} className="rounded-xl">
              Close
            </Button>
            <Button onClick={handleRestartStage} className="rounded-xl gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Restart Stage
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
