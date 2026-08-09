import { FileText, Video, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/utils/cn";
import type { UploadJob, UploadStage } from "@/types";

const STAGE_ORDER: UploadStage[] = ["uploaded", "extracted", "chunked", "embedded", "indexed", "ready"];
const STAGE_LABEL: Record<UploadStage, string> = {
  uploaded: "Uploaded",
  extracted: "Extracted",
  chunked: "Chunked",
  embedded: "Embedded",
  indexed: "Indexed",
  ready: "Ready",
};

export function UploadProgress({ job }: { job: UploadJob }) {
  const activeIndex = STAGE_ORDER.indexOf(job.stage);
  const Icon = job.type === "video" ? Video : FileText;

  return (
    <Card className="p-[18px]">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-indigo/10 text-atlas-indigo">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[13.5px] font-bold">{job.fileName}</div>
            <div className="text-[11px] text-muted-foreground">
              {job.type} · {job.sizeLabel}
            </div>
          </div>
        </div>
        <StatusBadge status={job.stage === "ready" ? "active" : "processing"} />
      </div>

      <div className="flex items-center">
        {STAGE_ORDER.map((stage, i) => (
          <div key={stage} className="flex items-center">
            <div className="flex min-w-[58px] flex-col items-center">
              <div
                className={cn(
                  "flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-bold",
                  i <= activeIndex ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                {i <= activeIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div className={cn("mt-1.5 text-center text-[10px] font-semibold", i <= activeIndex ? "text-foreground" : "text-muted-foreground")}>
                {STAGE_LABEL[stage]}
              </div>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div className={cn("mb-4 h-0.5 flex-1", i < activeIndex ? "bg-success" : "bg-border")} />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
