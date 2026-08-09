import { motion } from "framer-motion";
import { CheckCircle2, Loader2, CircleDashed } from "lucide-react";
import { cn } from "@/utils/cn";
import type { PipelineStage } from "@/types";

export function PipelineNode({ stage, compact = false }: { stage: PipelineStage; compact?: boolean }) {
  const tone =
    stage.status === "done" ? "bg-success/10 text-success" : stage.status === "active" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground";

  const Icon = stage.status === "done" ? CheckCircle2 : stage.status === "active" ? Loader2 : CircleDashed;

  if (compact) {
    return (
      <div className="flex min-w-[92px] flex-shrink-0 flex-col items-center">
        <div className={cn("relative flex h-11 w-11 items-center justify-center rounded-xl", tone, stage.status === "active" && "ring-2 ring-primary")}>
          <Icon className={cn("h-4.5 w-4.5", stage.status === "active" && "animate-spin")} />
          {stage.status === "active" && (
            <motion.span
              className="absolute inset-[-4px] rounded-2xl border border-primary/40"
              animate={{ scale: [0.9, 1.25, 0.9], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </div>
        <div className="mt-2 text-center text-[11px] font-semibold leading-tight">{stage.name}</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">{stage.durationLabel}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone)}>
            <Icon className={cn("h-4 w-4", stage.status === "active" && "animate-spin")} />
          </div>
          <span className="text-[13px] font-bold">{stage.name}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-secondary px-2.5 py-1.5">
          <div className="text-[9.5px] font-bold uppercase text-muted-foreground">Time</div>
          <div className="mt-0.5 text-[12.5px] font-bold">{stage.durationLabel}</div>
        </div>
        <div className="rounded-lg bg-secondary px-2.5 py-1.5">
          <div className="text-[9.5px] font-bold uppercase text-muted-foreground">Records</div>
          <div className="mt-0.5 text-[12.5px] font-bold">{stage.recordsLabel}</div>
        </div>
      </div>
    </div>
  );
}

export function PipelineFlow({ stages }: { stages: PipelineStage[] }) {
  const lastDoneIndex = stages.findIndex((s) => s.status !== "done") - 1;
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center">
          <PipelineNode stage={stage} compact />
          {i < stages.length - 1 && (
            <div className={cn("mb-6 h-0.5 w-6 flex-shrink-0", i <= lastDoneIndex ? "bg-success" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}
