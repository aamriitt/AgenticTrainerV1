import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, Check, ExternalLink, ShieldCheck, Zap, ZapOff, Server, Cloud, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/contexts/toast-context";
import {
  getStoredProvider,
  setStoredProvider,
  getStoredModel,
  setStoredModel,
  getStoredApiKey,
  setStoredApiKey,
  getStoredOllamaUrl,
  setStoredOllamaUrl,
  isLLMEnabled,
  setLLMEnabled,
  hasLiveLLM,
  type LLMProvider,
} from "@/services/llm-client";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

/**
 * Lets a person connect a real LLM to Ask Atlas — either a free local
 * Ollama server (e.g. running Gemma, no key needed) or the Anthropic API
 * with their own key. Anything entered here stays in this browser only.
 */
export function ApiKeyModal({ isOpen, onClose, onChanged }: ApiKeyModalProps) {
  const { toast } = useToast();
  const [provider, setProvider] = useState<LLMProvider>(getStoredProvider());
  const [ollamaUrl, setOllamaUrl] = useState(getStoredOllamaUrl());
  const [ollamaModel, setOllamaModel] = useState(getStoredModel("ollama"));
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [anthropicModel, setAnthropicModel] = useState(getStoredModel("anthropic"));

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredProvider(provider);
    if (provider === "ollama") {
      setStoredOllamaUrl(ollamaUrl);
      setStoredModel("ollama", ollamaModel);
    } else {
      setStoredApiKey(apiKey);
      setStoredModel("anthropic", anthropicModel);
    }
    setLLMEnabled(true);
    onChanged?.();
    toast({
      title: "Live LLM connected",
      description: provider === "ollama" ? `Ask Atlas will now call your local Ollama (${ollamaModel}).` : "Ask Atlas will now call the real Anthropic API.",
      type: "success",
    });
    onClose();
  };

  const handleDisconnect = () => {
    setLLMEnabled(false);
    onChanged?.();
    toast({ title: "Live LLM disconnected", description: "Ask Atlas is back in demo mode.", type: "info" });
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
          className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-border pb-3.5 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Connect a live LLM</h3>
                <p className="text-xs text-muted-foreground">Ask Atlas will call a real model</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
            {hasLiveLLM() ? <Zap className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" /> : <ZapOff className="h-3.5 w-3.5 flex-shrink-0" />}
            Currently in <strong className="text-foreground">{hasLiveLLM() ? "Live LLM" : "Demo"}</strong> mode.
          </div>

          {/* Provider toggle */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setProvider("ollama")}
              className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
                provider === "ollama" ? "border-primary bg-primary/10 shadow-xs" : "border-border/70 hover:border-border"
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Server className="h-3.5 w-3.5 text-emerald-500" /> Ollama
              </span>
              <span className="text-[10.5px] text-muted-foreground">Free, local (e.g. Gemma) — no key needed</span>
            </button>
            <button
              onClick={() => setProvider("anthropic")}
              className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
                provider === "anthropic" ? "border-primary bg-primary/10 shadow-xs" : "border-border/70 hover:border-border"
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Cloud className="h-3.5 w-3.5 text-atlas-indigo" /> Anthropic
              </span>
              <span className="text-[10.5px] text-muted-foreground">Cloud API — needs your own key</span>
            </button>
          </div>

          {provider === "ollama" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-[11px] text-foreground/80">
                <Terminal className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                <div>
                  Run once, in a terminal:
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-secondary px-2 py-1.5 font-mono text-[10.5px]">ollama pull {ollamaModel || "gemma2"}{"\n"}OLLAMA_ORIGINS=* ollama serve</pre>
                  The <code>OLLAMA_ORIGINS</code> flag is required so your browser is allowed to call it.
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ollama-url">Ollama server URL</Label>
                <Input id="ollama-url" value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder="http://localhost:11434" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ollama-model">Model</Label>
                <Input id="ollama-model" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} placeholder="gemma2" />
                <p className="text-[10.5px] text-muted-foreground">Try "gemma2", "gemma2:2b" (lighter), or any model you've pulled.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="api-key" className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" /> Anthropic API key
                </Label>
                <Input id="api-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" />
                <p className="text-[10.5px] text-muted-foreground">
                  Stored only in this browser, sent only to api.anthropic.com.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={anthropicModel} onChange={(e) => setAnthropicModel(e.target.value)} placeholder="claude-sonnet-4-5-20250929" />
              </div>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline w-fit"
              >
                Get an API key from the Anthropic Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-2 pt-4 border-t border-border">
            {isLLMEnabled() ? (
              <Button variant="secondary" onClick={handleDisconnect} className="rounded-xl text-xs">
                Disconnect
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSave} className="rounded-xl gap-2">
                <Check className="h-3.5 w-3.5" /> Connect
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
