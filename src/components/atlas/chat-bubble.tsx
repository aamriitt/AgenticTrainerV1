import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, Copy, Clock, FileText, Check } from "lucide-react";
import { useState } from "react";
import { AtlasAvatar } from "@/components/branding/atlas-avatar";
import { ConfidenceBadge } from "@/components/common/confidence-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";
import type { ChatMessage, Citation } from "@/types";

interface ChatBubbleProps {
  message: ChatMessage;
  onFollowup?: (question: string) => void;
  onSelectCitation?: (citation: Citation) => void;
  onFeedback?: (type: "up" | "down") => void;
  onHover?: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function ChatBubble({ message, onFollowup, onSelectCitation, onFeedback, onHover }: ChatBubbleProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Atlas answer content copied successfully.",
      type: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-[13.5px] leading-relaxed text-primary-foreground shadow-xs">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={onHover}
      className="mb-6 flex gap-2.5"
    >
      <AtlasAvatar size="md" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4.5 py-3.5 text-[13.5px] leading-relaxed text-foreground shadow-xs">
          {message.content}

          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-border/60">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Sources:</span>
              {message.citations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCitation?.(c)}
                  className="flex items-center gap-1 rounded-md border border-border/80 bg-secondary/80 px-2 py-0.5 text-[11px] font-semibold text-primary transition-all hover:bg-primary/10 hover:border-primary/40"
                >
                  <FileText className="h-3 w-3 text-atlas-indigo" />
                  <span className="truncate max-w-[140px]">{c.title}</span>
                  <span className="text-[10px] text-muted-foreground">({c.locator})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          {typeof message.confidence === "number" && <ConfidenceBadge value={message.confidence} />}
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {formatTime(message.timestamp)}
          </span>
          <div className="ml-auto flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onFeedback?.("up")}
              title="Helpful response"
              className="h-6.5 w-6.5 rounded-lg hover:text-emerald-500"
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onFeedback?.("down")}
              title="Report issue"
              className="h-6.5 w-6.5 rounded-lg hover:text-destructive"
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleCopy}
              title="Copy text"
              className="h-6.5 w-6.5 rounded-lg"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {message.followups && message.followups.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {message.followups.map((f) => (
              <button
                key={f}
                onClick={() => onFollowup?.(f)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary/10 hover:border-primary/40 shadow-2xs"
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
