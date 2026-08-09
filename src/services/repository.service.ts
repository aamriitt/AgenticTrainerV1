import { mockRequest } from "./api-client";
import { MOCK_KNOWLEDGE_ITEMS } from "@/constants/mock-data";

export const repositoryService = {
  list: () => mockRequest(MOCK_KNOWLEDGE_ITEMS),
};
