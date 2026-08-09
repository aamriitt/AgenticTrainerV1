import { FileText, Video, ClipboardList, BookOpen, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Citation, KnowledgeType } from "@/types";

const TYPE_ICON: Record<KnowledgeType, typeof FileText> = {
  pdf: FileText,
  video: Video,
  runbook: ClipboardList,
  faq: BookOpen,
  architecture: FileText,
  transcript: FileText,
};

const TYPE_TONE: Record<KnowledgeType, string> = {
  pdf: "bg-atlas-indigo/10 text-atlas-indigo",
  video: "bg-destructive/10 text-destructive",
  runbook: "bg-atlas-blue/10 text-atlas-blue",
  faq: "bg-success/10 text-success",
  architecture: "bg-atlas-indigo/10 text-atlas-indigo",
  transcript: "bg-atlas-indigo/10 text-atlas-indigo",
};

export function CitationCard({ citation, onClick }: { citation: Citation; onClick?: () => void }) {
  const Icon = TYPE_ICON[citation.type] || FileText;
  return (
    <Card
      onClick={onClick}
      className="p-3 cursor-pointer transition-all hover:border-primary/50 hover:bg-secondary/40 group"
    >
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${TYPE_TONE[citation.type] || "bg-primary/10 text-primary"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold leading-snug truncate group-hover:text-primary transition-colors">{citation.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{citation.locator}</p>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </div>
    </Card>
  );
}
