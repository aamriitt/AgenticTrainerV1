import { mockRequest } from "./api-client";
import { MOCK_PIPELINE_STAGES } from "@/constants/mock-data";

export const pipelineService = {
  getStages: () => mockRequest(MOCK_PIPELINE_STAGES),
};
