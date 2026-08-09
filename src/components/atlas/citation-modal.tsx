import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Video, Sparkles, ExternalLink, CheckCircle2, User, Clock, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/contexts/toast-context";
import { useNavigate } from "react-router-dom";
import type { Citation } from "@/types";

interface CitationInspectorModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationInspectorModal({ citation, onClose }: CitationInspectorModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!citation) return null;

  const getIcon = () => {
    switch (citation.type) {
      case "video":
        return <Video className="h-5 w-5 text-blue-500" />;
      case "runbook":
        return <FileCode className="h-5 w-5 text-amber-500" />;
      default:
        return <FileText className="h-5 w-5 text-indigo-500" />;
    }
  };

  const handleOpenRepository = () => {
    onClose();
    navigate("/repository");
    toast({
      title: "Opening Repository",
      description: `Viewing detailed source file: ${citation.title}`,
      type: "info",
    });
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
          className="relative w-full max-w-xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden"
        >
          <div className="flex items-start justify-between mb-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                {getIcon()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-foreground">{citation.title}</h3>
                  <Badge variant="indigo" className="capitalize">{citation.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span>Locator: <strong className="text-foreground">{citation.locator}</strong></span>
                  <span>•</span>
                  <span>Vector Match: <strong className="text-emerald-500 font-mono">94.2% similarity</strong></span>
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-atlas-indigo" />
                Retrieved Vector Chunk Preview
              </label>
              <div className="rounded-xl border border-border/70 bg-secondary/50 p-4 font-mono text-[12px] leading-relaxed text-foreground/90">
                <div className="text-[10px] text-muted-foreground uppercase font-sans font-bold mb-1.5 flex justify-between">
                  <span>Chunk ID: #chk-84920</span>
                  <span>Tokens: 148</span>
                </div>
                &quot;... The primary ETL workflow for raw usage events ingests from Kinesis streams every 5 minutes.
                Aggregated records are written to S3 before triggering the nightly Stripe invoice generator. Retry policies
                are strictly enforced with exponential backoff on Glue job failures ...&quot;
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3.5 bg-card">
                <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 mb-1">
                  <User className="h-3.5 w-3.5" /> SME Owner
                </div>
                <div className="text-xs font-bold text-foreground">Priya Sharma</div>
                <div className="text-[10.5px] text-muted-foreground">Lead Staff Data Engineer</div>
              </div>

              <div className="rounded-xl border border-border p-3.5 bg-card">
                <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 mb-1">
                  <Clock className="h-3.5 w-3.5" /> Index Refresh
                </div>
                <div className="text-xs font-bold text-foreground">August 6, 2026</div>
                <div className="text-[10.5px] text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Fully Synced
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-border">
            <Button variant="secondary" onClick={onClose} className="rounded-xl">
              Close
            </Button>
            <Button onClick={handleOpenRepository} className="rounded-xl gap-2">
              <ExternalLink className="h-3.5 w-3.5" /> Open in Repository
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
