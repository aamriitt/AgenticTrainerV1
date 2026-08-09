import { mockRequest } from "./api-client";
import { MOCK_AGENTS } from "@/constants/mock-data";

export const agentsService = {
  list: () => mockRequest(MOCK_AGENTS),
};
