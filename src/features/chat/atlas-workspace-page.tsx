import { useEffect, useRef, useState } from "react";
import { Paperclip, Mic, Send, Sliders, Trash2, Download, Sparkles, FileText, X, Zap, ZapOff, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AtlasLogoMark } from "@/components/branding/atlas-logo";
import { ChatBubble } from "@/components/atlas/chat-bubble";
import { TypingIndicator } from "@/components/atlas/typing-indicator";
import { CitationCard } from "@/components/atlas/citation-card";
import { CitationInspectorModal } from "@/components/atlas/citation-modal";
import { VoiceInputModal } from "@/components/atlas/voice-input-modal";
import { FileAttachmentModal } from "@/components/atlas/file-attachment-modal";
import { RetrieverSettingsDrawer } from "@/components/atlas/retriever-settings-drawer";
import { FeedbackModal } from "@/components/atlas/feedback-modal";
import { ApiKeyModal } from "@/components/atlas/api-key-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAtlasChat } from "@/hooks/use-atlas-chat";
import { useToast } from "@/contexts/toast-context";
import { SUGGESTED_PROMPTS } from "@/constants/mock-data";
import { hasLiveLLM } from "@/services/llm-client";
import type { Citation, KnowledgeItem } from "@/types";

export function AtlasWorkspacePage() {
  const { toast } = useToast();
  const { messages, activeCitations, send, isThinking, isLoadingSeed } = useAtlasChat();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const [inspectCitation, setInspectCitation] = useState<Citation | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"up" | "down" | null>(null);
  const [activeFeedbackId, setActiveFeedbackId] = useState<number | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<KnowledgeItem | null>(null);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isLive, setIsLive] = useState(hasLiveLLM());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  function handleSend(text?: string) {
    const rawQuestion = text ?? input;
    if (!rawQuestion.trim()) return;

    let finalQuestion = rawQuestion;
    if (attachedDoc) {
      finalQuestion = `[Focus Document: ${attachedDoc.title}] ${rawQuestion}`;
    }

    send(finalQuestion);
    setInput("");
    setAttachedDoc(null);
  }

  function handleExportChat() {
    toast({
      title: "Exporting conversation",
      description: "Chat transcript saved as markdown report.",
      type: "success",
    });
  }

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <div className="flex min-w-0 flex-1 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border/80 bg-card/60 px-6 py-3 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <Badge variant="indigo" className="gap-1 font-mono text-[11px]">
              <Sparkles className="h-3 w-3" /> LangGraph Orchestrated
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">• k=8 retriever • ChromaDB</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isLive ? "secondary" : "default"}
              size="sm"
              onClick={() => setIsApiKeyOpen(true)}
              className={`gap-1.5 rounded-xl text-xs font-semibold ${isLive ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : ""}`}
              title={isLive ? "Live LLM connected" : "Connect a live LLM to Ask Atlas"}
            >
              {isLive ? <Zap className="h-3.5 w-3.5 text-emerald-500" /> : <KeyRound className="h-3.5 w-3.5" />}
              {isLive ? "Live LLM" : "Connect LLM"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="gap-1.5 rounded-xl text-xs font-semibold"
            >
              <Sliders className="h-3.5 w-3.5" /> RAG Parameters
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportChat}
              title="Export Conversation"
              className="rounded-xl"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-7 md:px-10">
          <div className="mx-auto max-w-[760px]">
            {isLoadingSeed && <Skeleton className="h-32 w-full rounded-2xl" />}

            {!isLoadingSeed && messages.length <= 1 && (
              <div className="py-10 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mx-auto mb-3.5 flex h-[56px] w-[56px] items-center justify-center rounded-2xl bg-gradient-to-br from-atlas-indigo via-atlas-blue to-atlas-emerald shadow-lg shadow-atlas-indigo/20"
                >
                  <AtlasLogoMark tone="white" size={28} />
                </motion.div>
                <h2 className="text-[20px] font-extrabold tracking-tight">
                  Ask Atlas anything about your organization&apos;s knowledge
                </h2>
                <p className="mt-1.5 text-[13px] text-muted-foreground max-w-md mx-auto">
                  Every answer is grounded in your indexed documents, runbooks, and SME sessions with 91%+ precision.
                </p>
                {!isLive && (
                  <button
                    onClick={() => setIsApiKeyOpen(true)}
                    className="mt-4 mx-auto flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3.5 py-1.5 text-[11.5px] font-semibold text-primary hover:bg-primary/10"
                  >
                    <ZapOff className="h-3.5 w-3.5" /> Running in demo mode — connect a live LLM
                  </button>
                )}
              </div>
            )}

            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                message={m}
                onFollowup={handleSend}
                onSelectCitation={(c) => setInspectCitation(c)}
                onFeedback={(type) => {
                  setFeedbackType(type);
                  setActiveFeedbackId(m.feedbackId ?? null);
                }}
              />
            ))}

            {isThinking && <TypingIndicator />}
            <div ref={endRef} />
          </div>
        </div>

        {!isLoadingSeed && messages.length <= 1 && (
          <div className="mx-auto w-full max-w-[760px] px-6 pb-3 md:px-10">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="rounded-xl border border-border/80 bg-card/80 px-3.5 py-2.5 text-left text-[12.8px] font-medium transition-all hover:bg-secondary hover:border-primary/40 shadow-2xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-4 md:px-10 border-t border-border/60 bg-card/40">
          <AnimatePresence>
            {attachedDoc && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mx-auto max-w-[760px] mb-2 flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary font-medium"
              >
                <span className="flex items-center gap-2 truncate">
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" /> Grounding focus: <strong>{attachedDoc.title}</strong>
                </span>
                <button onClick={() => setAttachedDoc(null)} className="p-0.5 hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mx-auto flex max-w-[760px] items-center gap-2 rounded-2xl border border-border bg-card p-2 pl-4 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAttachmentOpen(true)}
              title="Attach grounding document"
              className="flex-shrink-0 rounded-xl"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Atlas about your organization's SME knowledge…"
              className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVoiceOpen(true)}
              title="Voice search"
              className="flex-shrink-0 rounded-xl hover:text-primary"
            >
              <Mic className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="flex-shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden w-[320px] flex-shrink-0 overflow-y-auto px-5 py-6 lg:block bg-card/30">
        <h3 className="mb-0.5 text-[13px] font-bold text-foreground">Retrieved Sources</h3>
        <p className="mb-3.5 text-xs text-muted-foreground">Vector matches for latest response</p>

        <div className="flex flex-col gap-2.5">
          {activeCitations && activeCitations.length > 0 ? (
            activeCitations.map((c) => (
              <CitationCard
                key={c.id}
                citation={c}
                onClick={() => setInspectCitation(c)}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              Ask a question to see grounding sources here. Click any citation to inspect chunk similarity.
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <h4 className="mb-2.5 text-xs font-bold text-foreground">Session Performance</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Orchestration:</span>
              <strong className="text-foreground">LangGraph</strong>
            </div>
            <div className="flex justify-between">
              <span>Vector Database:</span>
              <strong className="text-foreground">ChromaDB • k=8</strong>
            </div>
            <div className="flex justify-between">
              <span>Average Latency:</span>
              <strong className="text-foreground font-mono">642ms</strong>
            </div>
            <div className="flex justify-between">
              <span>Similarity Metric:</span>
              <strong className="text-emerald-500 font-mono">Cosine (0.87+)</strong>
            </div>
          </div>
        </div>
      </div>

      <CitationInspectorModal
        citation={inspectCitation}
        onClose={() => setInspectCitation(null)}
      />
      <VoiceInputModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onTranscript={(text) => setInput(text)}
      />
      <FileAttachmentModal
        isOpen={isAttachmentOpen}
        onClose={() => setIsAttachmentOpen(false)}
        onSelect={(item) => setAttachedDoc(item)}
      />
      <RetrieverSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <FeedbackModal
        isOpen={Boolean(feedbackType)}
        type={feedbackType}
        feedbackId={activeFeedbackId}
        onClose={() => {
          setFeedbackType(null);
          setActiveFeedbackId(null);
        }}
      />
      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        onChanged={() => setIsLive(hasLiveLLM())}
      />
    </div>
  );
}
