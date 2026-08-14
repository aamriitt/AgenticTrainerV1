import { apiRequest, mockRequest } from "./api-client";
import { MOCK_CHAT_SEED } from "@/constants/mock-data";
import type { ChatMessage, Citation, KnowledgeType } from "@/types";

interface AskApiResponse {
  question: string;
  intent: string;
  answer: string;
  citations: string[];
  refused: boolean;
  confidence: number;
  feedback_id?: number | null;
}

function parseCitation(raw: string, index: number): Citation {
  // Backend format is usually "title — locator" from format_citation
  const parts = raw.split(" — ");
  const title = parts[0]?.trim() || raw;
  const locator = parts.slice(1).join(" — ").trim() || "source";
  const lower = title.toLowerCase();
  let type: KnowledgeType = "pdf";
  if (lower.includes("faq")) type = "faq";
  else if (lower.includes("runbook") || lower.includes("sop")) type = "runbook";
  else if (lower.includes("video") || lower.includes("kt")) type = "video";
  else if (lower.includes("architecture")) type = "architecture";

  return {
    id: `c-${Date.now()}-${index}`,
    title,
    type,
    locator,
  };
}

export const chatService = {
  getSeedConversation: () => mockRequest(MOCK_CHAT_SEED),

  /**
   * Sends a question to the grounded RAG pipeline via FastAPI `/ask`.
   */
  ask: async (question: string, _history: ChatMessage[] = []): Promise<ChatMessage> => {
    try {
      const data = await apiRequest<AskApiResponse>("/ask", {
        method: "POST",
        body: { question },
      });

      return {
        id: `m-${Date.now()}`,
        role: "atlas",
        content: data.answer,
        timestamp: new Date().toISOString(),
        confidence: Math.round((data.confidence ?? 0) * (data.confidence <= 1 ? 100 : 1)),
        citations: (data.citations ?? []).map(parseCitation),
        followups: data.refused
          ? ["Try a different question", "Upload a relevant SOP", "Browse Knowledge Repository"]
          : ["Can you cite more detail?", "Show related documents", "What should I do next?"],
        feedbackId: data.feedback_id ?? undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        id: `m-${Date.now()}`,
        role: "atlas",
        content: `⚠️ Could not reach the knowledge API (${message}). Make sure you are signed in and the API is running on port 8000.`,
        timestamp: new Date().toISOString(),
        confidence: 0,
        citations: [],
        followups: ["Retry", "Check API health"],
      };
    }
  },
};
