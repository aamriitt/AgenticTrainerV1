import { mockRequest } from "./api-client";
import { MOCK_UPLOAD_JOBS } from "@/constants/mock-data";

export const uploadService = {
  getQueue: () => mockRequest(MOCK_UPLOAD_JOBS),
};
