import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, FileText, MessagesSquare, Sparkles, ExternalLink } from "lucide-react";
import { historyService } from "@/services/history.service";
import { SearchBar } from "@/components/common/search-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";
import { initials } from "@/utils/format";
import { cn } from "@/utils/cn";

export function ConversationHistoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: conversations, isLoading } = useQuery({ queryKey: ["history"], queryFn: historyService.list });
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = (conversations ?? []).filter(
    (c) => c.topic.toLowerCase().includes(query.toLowerCase()) || c.user.toLowerCase().includes(query.toLowerCase())
  );

  const handleResumeThread = (topic: string) => {
    toast({
      title: "Resuming Conversation",
      description: `Loaded thread: "${topic}" in Ask Atlas.`,
      type: "info",
    });
    navigate("/atlas");
  };

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search conversation threads, users, documents…" className="w-full max-w-[340px]" />

        <div className="flex gap-2">
          <Badge variant="indigo" className="gap-1 text-xs py-1.5 px-3">
            <MessagesSquare className="h-3.5 w-3.5" /> Total Threads: {filtered.length}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center border-dashed rounded-2xl">
          <p className="text-sm font-semibold text-muted-foreground">No conversation threads found matching your query.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border/80 shadow-xs">
          {filtered.map((h, i) => (
            <div key={h.id} className="transition-colors hover:bg-secondary/30">
              <div
                onClick={() => setOpenId(openId === h.id ? null : h.id)}
                className={cn("flex cursor-pointer items-center gap-4 px-5 py-4", i > 0 && "border-t border-border/60")}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-atlas-indigo to-atlas-emerald text-[12px] font-bold text-white shadow-xs">
                  {initials(h.user)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.8px] font-extrabold text-foreground">{h.topic}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground flex items-center gap-2">
                    <span>{h.user}</span>
                    <span>•</span>
                    <span>{new Date(h.updatedAt).toLocaleString()}</span>
                    <span>•</span>
                    <span>{h.messageCount} messages</span>
                  </div>
                </div>
                <Badge variant="default" className="gap-1 hidden sm:inline-flex">
                  <FileText className="h-3 w-3 text-atlas-indigo" />
                  {h.primaryDocument}
                </Badge>
                <Badge variant={h.confidence >= 85 ? "emerald" : h.confidence >= 65 ? "amber" : "rose"}>
                  {h.confidence}% Grounded
                </Badge>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", openId === h.id && "rotate-90 text-primary")} />
              </div>

              {openId === h.id && (
                <div className="border-t border-border/40 bg-secondary/20 px-6 py-4 text-[12.5px] leading-relaxed text-muted-foreground">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      Full transcript grounded in <span className="font-bold text-foreground">{h.primaryDocument}</span>, retrieved with{" "}
                      <strong className="text-foreground">{h.confidence}% confidence</strong> across {h.messageCount} messages.
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleResumeThread(h.topic)}
                      className="rounded-xl gap-1.5 flex-shrink-0 text-xs shadow-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Continue in Ask Atlas
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
