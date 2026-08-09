import { useQuery } from "@tanstack/react-query";
import { agentsService } from "@/services/agents.service";

export function useAgents() {
  return useQuery({ queryKey: ["agents"], queryFn: agentsService.list, refetchInterval: 15000 });
}
