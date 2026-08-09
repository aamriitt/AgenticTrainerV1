import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, X, Check, Cpu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";

interface RetrieverSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RetrieverSettingsDrawer({ isOpen, onClose }: RetrieverSettingsDrawerProps) {
  const { toast } = useToast();
  const [topK, setTopK] = useState(8);
  const [rerank, setRerank] = useState(true);
  const [similarityThreshold, setSimilarityThreshold] = useState(75);
  const [temperature, setTemperature] = useState(0.2);

  if (!isOpen) return null;

  const handleSave = () => {
    toast({
      title: "RAG settings updated",
      description: `Retriever configured with Top-K=${topK}, Reranker=${rerank ? "Enabled" : "Disabled"}, Temp=${temperature}.`,
      type: "success",
    });
    onClose();
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
          initial={{ x: 380 }}
          animate={{ x: 0 }}
          exit={{ x: 380 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative flex h-full w-[380px] flex-col overflow-y-auto border-l border-border bg-card p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">RAG Parameters</h3>
                <p className="text-xs text-muted-foreground">Customize retrieval & reasoning options</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6 flex-1">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-foreground">Top-K Vector Chunks</label>
                <span className="text-xs font-bold text-primary font-mono">{topK} chunks</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Number of similar vector passages passed to Atlas reasoning agent.</p>
            </div>

            <div className="rounded-xl border border-border p-4 bg-secondary/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-atlas-indigo" />
                    Cohere Rerank v3
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Cross-encoder reranking for semantic relevance</div>
                </div>
                <input
                  type="checkbox"
                  checked={rerank}
                  onChange={(e) => setRerank(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-foreground">Minimum Similarity Score</label>
                <span className="text-xs font-bold text-emerald-500 font-mono">{similarityThreshold}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={95}
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Discard vector chunks with similarity score below threshold.</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-foreground font-mono">Generation Temperature ({temperature})</label>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Lower temperature ensures factual grounding and minimal hallucination.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-6 flex gap-2">
            <Button variant="secondary" onClick={onClose} className="flex-1 rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 rounded-xl gap-2">
              <Check className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
