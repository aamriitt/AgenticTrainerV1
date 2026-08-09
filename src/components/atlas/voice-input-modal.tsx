import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Check, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/toast-context";

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
}

const SAMPLE_VOICE_QUERIES = [
  "How does the Glue Job retry policy work in the billing pipeline?",
  "What is the escalation SLA for P1 incidents in the SOP?",
  "Can you summarize KT Session 4 regarding Auth and Billing?",
  "Where are the architecture changes for 2026 documented?",
];

export function VoiceInputModal({ isOpen, onClose, onTranscript }: VoiceInputModalProps) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [queryIndex, setQueryIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setTranscript("");
      setIsListening(true);
      return;
    }

    const targetQuery = SAMPLE_VOICE_QUERIES[queryIndex % SAMPLE_VOICE_QUERIES.length];
    let currentIndex = 0;

    const timer = setInterval(() => {
      if (currentIndex < targetQuery.length) {
        setTranscript(targetQuery.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(timer);
        setIsListening(false);
      }
    }, 45);

    return () => clearInterval(timer);
  }, [isOpen, queryIndex]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (transcript.trim()) {
      onTranscript(transcript);
      toast({
        title: "Voice query transcribed",
        description: "Speech converted to text successfully.",
        type: "success",
      });
    }
    onClose();
  };

  const handleRerecord = () => {
    setTranscript("");
    setIsListening(true);
    setQueryIndex((prev) => prev + 1);
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
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden text-center"
        >
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4 rounded-full">
            <X className="h-4 w-4" />
          </Button>

          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-atlas-indigo/20 via-atlas-blue/20 to-atlas-emerald/20 border border-primary/30 relative">
            {isListening ? (
              <motion.div
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-primary/20"
              />
            ) : null}
            <Mic className={`h-8 w-8 relative z-10 ${isListening ? "text-primary animate-pulse" : "text-emerald-500"}`} />
          </div>

          <h3 className="text-base font-extrabold text-foreground mb-1">
            {isListening ? "Listening to SME Voice Query…" : "Speech Transcribed"}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {isListening ? "Speak clearly into your microphone" : "Review transcript before submitting to Atlas"}
          </p>

          <div className="flex items-center justify-center gap-1.5 h-10 mb-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                animate={
                  isListening
                    ? { height: [8, Math.floor(Math.random() * 32) + 8, 8] }
                    : { height: 6 }
                }
                transition={{ duration: 0.5 + (i % 3) * 0.2, repeat: Infinity }}
                className="w-1.5 rounded-full bg-primary/80"
              />
            ))}
          </div>

          <div className="rounded-xl border border-border/80 bg-secondary/60 p-4 text-xs font-medium leading-relaxed text-foreground min-h-[72px] flex items-center justify-center text-center italic">
            {transcript ? `"${transcript}"` : "Waiting for audio input…"}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <Button variant="secondary" onClick={handleRerecord} className="flex-1 rounded-xl gap-2">
              <Volume2 className="h-3.5 w-3.5" /> Retry Voice
            </Button>
            <Button onClick={handleApply} disabled={!transcript.trim()} className="flex-1 rounded-xl gap-2">
              <Check className="h-3.5 w-3.5" /> Use Transcript
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
