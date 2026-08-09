import { CheckCircle2, Loader2, XCircle, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { IndexStatus, EmbeddingStatus, AgentStatus, UserStatus } from "@/types";

type AnyStatus = IndexStatus | EmbeddingStatus | AgentStatus | UserStatus | string;

const STATUS_MAP: Record<string, { label: string; variant: "emerald" | "amber" | "rose" | "default"; icon: typeof CheckCircle2 }> = {
  active: { label: "Active", variant: "emerald", icon: CheckCircle2 },
  healthy: { label: "Healthy", variant: "emerald", icon: CheckCircle2 },
  complete: { label: "Complete", variant: "emerald", icon: CheckCircle2 },
  processing: { label: "Processing", variant: "amber", icon: Loader2 },
  in_progress: { label: "In progress", variant: "amber", icon: Loader2 },
  degraded: { label: "Degraded", variant: "amber", icon: Loader2 },
  invited: { label: "Invited", variant: "amber", icon: Loader2 },
  queued: { label: "Queued", variant: "default", icon: CircleDashed },
  idle: { label: "Idle", variant: "default", icon: CircleDashed },
  needs_review: { label: "Needs review", variant: "rose", icon: XCircle },
  failed: { label: "Failed", variant: "rose", icon: XCircle },
  offline: { label: "Offline", variant: "rose", icon: XCircle },
  suspended: { label: "Suspended", variant: "rose", icon: XCircle },
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const entry = STATUS_MAP[status] ?? { label: status, variant: "default" as const, icon: CircleDashed };
  const Icon = entry.icon;
  return (
    <Badge variant={entry.variant}>
      <Icon className="h-3 w-3" />
      {entry.label}
    </Badge>
  );
}
