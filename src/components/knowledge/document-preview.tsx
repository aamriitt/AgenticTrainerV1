import type { ReactNode } from "react";
import { X, Eye, Download, RefreshCw, FileText, User, Calendar, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/status-badge";
import { useToast } from "@/contexts/toast-context";
import { useNavigate } from "react-router-dom";
import type { KnowledgeItem } from "@/types";

interface DocumentPreviewProps {
  item: KnowledgeItem | null;
  onClose: () => void;
}

export function DocumentPreview({ item, onClose }: DocumentPreviewProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!item) return null;

  const handleReindex = () => {
    toast({
      title: "Re-indexing initiated",
      description: `Rebuilding vector embeddings for "${item.title}".`,
      type: "success",
    });
  };

  const handleDownload = () => {
    toast({
      title: "Downloading source document",
      description: `Downloading ${item.title}...`,
      type: "info",
    });
  };

  const handleAskAtlas = () => {
    onClose();
    navigate("/atlas");
    toast({
      title: "Opening Ask Atlas",
      description: `Grounding workspace set to: ${item.title}`,
      type: "info",
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
        />
        <motion.div
          initial={{ x: 440 }}
          animate={{ x: 0 }}
          exit={{ x: 440 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative flex h-full w-[440px] flex-col overflow-y-auto border-l border-border bg-card p-6 shadow-2xl"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-atlas-indigo/10 text-atlas-indigo border border-atlas-indigo/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground">ID: #{item.id}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="mb-4 text-xs text-muted-foreground flex items-center gap-2">
            <User className="h-3.5 w-3.5" /> SME Owner: <strong className="text-foreground">{item.sme}</strong>
          </p>

          <div className="mb-5 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="indigo">{tag}</Badge>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2.5">
            <InfoTile label="Status"><StatusBadge status={item.status} /></InfoTile>
            <InfoTile label="Embedding"><StatusBadge status={item.embeddingStatus} /></InfoTile>
            <InfoTile label="Category" value={item.type.toUpperCase()} />
            <InfoTile label="Last indexed" value={item.lastIndexedAt ? new Date(item.lastIndexedAt).toLocaleDateString() : "Pending"} />
          </div>

          <div className="mb-5 space-y-2">
            <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Extracted Passage Chunks (ChromaDB)
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3.5 font-mono text-[11.5px] leading-relaxed text-foreground">
              &quot;Section 4.2: Ingestion rules require raw payload verification against schema v3.
              Failed records automatically log to dead-letter queue with error code ERR_PAYLOAD_MISMATCH...&quot;
            </div>
          </div>

          <div className="mt-auto space-y-2.5 pt-4 border-t border-border">
            <Button onClick={handleAskAtlas} className="w-full rounded-xl gap-2 shadow-sm">
              <Eye className="h-4 w-4" /> Ask Atlas About This Doc
            </Button>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleReindex} className="flex-1 rounded-xl gap-2">
                <RefreshCw className="h-3.5 w-3.5" /> Re-index
              </Button>
              <Button variant="secondary" onClick={handleDownload} className="flex-1 rounded-xl gap-2">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function InfoTile({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold capitalize text-foreground">{children ?? value}</div>
    </div>
  );
}
