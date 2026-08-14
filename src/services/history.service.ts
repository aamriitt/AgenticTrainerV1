import { apiRequest } from "./api-client";
import type { Conversation } from "@/types";

interface InteractionRow {
  id: number;
  created_at: string;
  question: string;
  answer: string;
  intent?: string | null;
  citations?: string | null;
  rating?: string | null;
  status?: string;
}

interface InteractionsResponse {
  items: InteractionRow[];
  count: number;
}

function toConversation(row: InteractionRow): Conversation {
  const cite = (row.citations || "").split("|")[0] || "Enterprise knowledge";
  return {
    id: String(row.id),
    user: "Atlas user",
    topic: row.question,
    confidence: row.rating === "up" ? 92 : row.rating === "down" ? 55 : 78,
    primaryDocument: cite.slice(0, 80) || "Knowledge base",
    updatedAt: row.created_at,
    messageCount: 2,
  };
}

export const historyService = {
  list: async (): Promise<Conversation[]> => {
    const data = await apiRequest<InteractionsResponse>("/interactions?limit=50");
    return (data.items ?? []).map(toConversation);
  },
};
