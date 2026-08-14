import { apiRequest } from "./api-client";

export const feedbackService = {
  thumbsUp: (feedbackId: number) =>
    apiRequest<{ status: string }>(`/feedback/${feedbackId}/up`, { method: "POST" }),

  thumbsDown: (feedbackId: number, correction: string) =>
    apiRequest<{ status: string; queued_for_sme_review?: boolean }>(`/feedback/${feedbackId}/down`, {
      method: "POST",
      body: { correction },
    }),
};
