/**
 * The six specialized agents Atlas orchestrates, plus the Orchestrator
 * itself. This list is also the conceptual basis for the Atlas logomark
 * (six outer nodes + the orchestrating "A" at the center).
 */
export const AGENT_ROLES = [
  "Orchestrator Agent",
  "Intent Agent",
  "Retrieval Agent",
  "Reasoning Agent",
  "Memory Agent",
  "Citation Agent",
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];
