import { mockRequest } from "./api-client";
import { knowledgeStore } from "./knowledge-store.service";

export const repositoryService = {
  list: () => mockRequest(knowledgeStore.list()),
};
