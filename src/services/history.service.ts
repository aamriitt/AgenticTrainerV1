import { mockRequest } from "./api-client";
import { MOCK_CONVERSATIONS } from "@/constants/mock-data";

export const historyService = {
  list: () => mockRequest(MOCK_CONVERSATIONS),
};
