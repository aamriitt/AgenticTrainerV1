import { FileText, Video, ClipboardList, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/status-badge";
import type { KnowledgeItem, KnowledgeType } from "@/types";

const TYPE_ICON: Record<KnowledgeType, typeof FileText> = {
  pdf: FileText,
  video: Video,
  runbook: ClipboardList,
  faq: BookOpen,
  architecture: FileText,
  transcript: FileText,
};

interface KnowledgeCardProps {
  item: KnowledgeItem;
  onClick?: () => void;
}

export function KnowledgeCard({ item, onClick }: KnowledgeCardProps) {
  const Icon = TYPE_ICON[item.type];
  return (
    <Card onClick={onClick} className="cursor-pointer p-4">
      <div className="mb-2.5 flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-atlas-indigo/10 text-atlas-indigo">
          <Icon className="h-4 w-4" />
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mb-1.5 text-[13.5px] font-bold leading-snug">{item.title}</p>
      <p className="mb-2.5 text-[11px] text-muted-foreground">
        {item.sme} · {new Date(item.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
      <div className="flex flex-wrap gap-1">
        {item.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </Card>
  );
}
