import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat.service";
import type { ChatMessage } from "@/types";

/**
 * Drives the Ask Atlas workspace: seeds the conversation, tracks the
 * currently-cited sources, and exposes a `send` mutation with an
 * optimistic user turn while Atlas "thinks".
 */
export function useAtlasChat() {
  const queryClient = useQueryClient();
  const seedQuery = useQuery({ queryKey: ["atlas", "seed"], queryFn: chatService.getSeedConversation });

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [activeCitations, setActiveCitations] = React.useState<ChatMessage["citations"]>([]);

  React.useEffect(() => {
    if (seedQuery.data && messages.length === 0) {
      setMessages(seedQuery.data);
      const lastWithCitations = [...seedQuery.data].reverse().find((m) => m.citations?.length);
      setActiveCitations(lastWithCitations?.citations ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery.data]);

  const askMutation = useMutation({
    mutationFn: (question: string) => chatService.ask(question, messages),
    onMutate: async (question: string) => {
      const userTurn: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: question,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userTurn]);
    },
    onSuccess: (answer) => {
      setMessages((prev) => [...prev, answer]);
      setActiveCitations(answer.citations ?? []);
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const send = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    askMutation.mutate(trimmed);
  };

  return {
    messages,
    activeCitations,
    send,
    isThinking: askMutation.isPending,
    isLoadingSeed: seedQuery.isLoading,
  };
}
