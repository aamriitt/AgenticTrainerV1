import { apiRequest, mockRequest } from "./api-client";
import { MOCK_UPLOAD_JOBS } from "@/constants/mock-data";
import type { UploadJob } from "@/types";

interface UploadResponse {
  filename: string;
  chunks_indexed: number;
}

export const uploadService = {
  getQueue: () => mockRequest<UploadJob[]>(MOCK_UPLOAD_JOBS),

  /** Upload + index a knowledge file through FastAPI `/upload`. */
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<UploadResponse>("/upload", {
      method: "POST",
      body: form,
    });
  },
};
