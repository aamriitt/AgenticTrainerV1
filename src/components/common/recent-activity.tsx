import { FileText, RefreshCw, MessagesSquare, AlertTriangle, Video, type LucideIcon } from "lucide-react";
import { relativeTime } from "@/utils/format";
import type { ActivityEvent } from "@/types";

const KIND_ICON: Record<ActivityEvent["kind"], LucideIcon> = {
  upload: FileText,
  reindex: RefreshCw,
  feedback: MessagesSquare,
  alert: AlertTriangle,
  session: Video,
};

const KIND_TONE: Record<ActivityEvent["kind"], string> = {
  upload: "bg-atlas-indigo/10 text-atlas-indigo",
  reindex: "bg-atlas-blue/10 text-atlas-blue",
  feedback: "bg-success/10 text-success",
  alert: "bg-warning/10 text-warning",
  session: "bg-atlas-indigo/10 text-atlas-indigo",
};

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="flex flex-col">
      {events.map((event, i) => {
        const Icon = KIND_ICON[event.kind];
        return (
          <div key={event.id} className={i > 0 ? "flex gap-3 border-t border-border py-2.5" : "flex gap-3 py-2.5"}>
            <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${KIND_TONE[event.kind]}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug text-foreground">
                <span className="font-bold">{event.actor}</span> {event.action}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{relativeTime(event.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
