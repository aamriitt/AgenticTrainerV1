import { mockRequest } from "./api-client";
import { MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES } from "@/constants/mock-data";

export const graphService = {
  getNodes: () => mockRequest(MOCK_GRAPH_NODES),
  getEdges: () => mockRequest(MOCK_GRAPH_EDGES),
};
