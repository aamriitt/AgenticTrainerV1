import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, X, Check, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";

interface FeedbackModalProps {
  isOpen: boolean;
  type: "up" | "down" | null;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, type, onClose }: FeedbackModalProps) {
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [notifySme, setNotifySme] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = () => {
    toast({
      title: type === "up" ? "Feedback submitted!" : "Issue reported to SME",
      description: type === "up" ? "Thank you for rating Atlas response." : "SME team notified for knowledge base refinement.",
      type: type === "up" ? "success" : "info",
    });
    setComment("");
    onClose();
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
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                type === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
              }`}>
                {type === "up" ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  {type === "up" ? "Helpful Response" : "Report Response Issue"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {type === "up" ? "What made this response helpful?" : "Help us improve Atlas grounding accuracy"}
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
                  ? "Optional: Add comments on what was answered well..."
                  : "Explain what was missing or incorrect (e.g. outdated runbook section, missing SME detail)..."
              }
              className="w-full rounded-xl border border-border bg-secondary/50 p-3 text-xs outline-none focus:border-primary placeholder:text-muted-foreground"
            />

            {type === "down" && (
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={notifySme}
                  onChange={(e) => setNotifySme(e.target.checked)}
                  className="rounded accent-primary"
                />
                Notify topic SME (Priya Sharma) to review knowledge source
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="rounded-xl gap-2">
              <Send className="h-3.5 w-3.5" /> Submit Feedback
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
