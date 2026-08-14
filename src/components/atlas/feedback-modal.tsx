import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";
import { feedbackService } from "@/services/feedback.service";

interface FeedbackModalProps {
  isOpen: boolean;
  type: "up" | "down" | null;
  feedbackId?: number | null;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, type, feedbackId, onClose }: FeedbackModalProps) {
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!feedbackId) {
      toast({
        title: "Feedback not linked",
        description: "This answer has no backend feedback id yet. Ask a new question after signing in.",
        type: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      if (type === "up") {
        await feedbackService.thumbsUp(feedbackId);
        toast({ title: "Feedback submitted", description: "Thanks — thumbs up recorded.", type: "success" });
      } else {
        const correction = comment.trim() || "Answer was not helpful / incorrect.";
        await feedbackService.thumbsDown(feedbackId, correction);
        toast({
          title: "Issue queued for SME review",
          description: "Correction saved to the validation queue.",
          type: "info",
        });
      }
      setComment("");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save feedback";
      toast({ title: "Feedback failed", description: message, type: "error" });
    } finally {
      setBusy(false);
    }
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
          className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border pb-3.5 mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  type === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                }`}
              >
                {type === "up" ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  {type === "up" ? "Helpful Response" : "Report Response Issue"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {type === "up" ? "Confirm this response was useful" : "Send a correction to the SME review queue"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4 mb-4">
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                type === "up"
                  ? "Optional: what worked well..."
                  : "What should Atlas have said instead? (required for SME learning)"
              }
              className="w-full rounded-xl border border-border bg-secondary/50 p-3 text-xs outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {busy ? "Saving…" : "Submit feedback"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
