import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, X, FileText, Check, Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_KNOWLEDGE_ITEMS } from "@/constants/mock-data";
import { useToast } from "@/contexts/toast-context";
import type { KnowledgeItem } from "@/types";

interface FileAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: KnowledgeItem) => void;
}

export function FileAttachmentModal({ isOpen, onClose, onSelect }: FileAttachmentModalProps) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const item = MOCK_KNOWLEDGE_ITEMS.find((k) => k.id === selectedId);
    if (item) {
      onSelect(item);
      toast({
        title: "Attachment added",
        description: `Attached ${item.title} to your prompt context.`,
        type: "success",
      });
    }
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
          className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border pb-3.5 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Paperclip className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Attach Context Document</h3>
                <p className="text-xs text-muted-foreground">Force Atlas to ground its response in a specific source</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 mb-4">
            {MOCK_KNOWLEDGE_ITEMS.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/70 hover:border-border hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="truncate min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{item.title}</div>
                      <div className="text-[10.5px] text-muted-foreground">{item.sme} • {item.type.toUpperCase()}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Or upload a new local file in Upload Center</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={!selectedId} className="rounded-xl gap-2">
                <Check className="h-3.5 w-3.5" /> Attach Document
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
