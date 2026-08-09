import { useQuery } from "@tanstack/react-query";
import { pipelineService } from "@/services/pipeline.service";

export function usePipelineStages() {
  return useQuery({ queryKey: ["pipeline", "stages"], queryFn: pipelineService.getStages, refetchInterval: 20000 });
}
