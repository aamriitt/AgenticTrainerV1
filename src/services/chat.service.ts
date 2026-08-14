import { mockRequest } from "./api-client";
import { MOCK_CHAT_SEED } from "@/constants/mock-data";
import { KNOWLEDGE_BASE_CONTEXT } from "@/constants/knowledge-context";
import { DEPARTMENTS } from "@/constants/departments";
import { hasLiveLLM, callLLM } from "@/services/llm-client";
import { knowledgeStore } from "@/services/knowledge-store.service";
import type { ChatMessage, Citation, KnowledgeItem } from "@/types";

const KNOWLEDGE_RESPONSES: Array<{
  keywords: string[];
  answer: string;
  confidence: number;
  citations: Citation[];
  followups: string[];
}> = [
  {
    keywords: ["glue", "retry", "etl", "job"],
    answer:
      "AWS Glue jobs in the billing pipeline feature an automatic 3-retry policy with exponential backoff (initial wait 60s, max wait 300s). If all 3 attempts fail, the job emits an SNS topic alert `arn:aws:sns:us-east-1:billing-pipeline-alerts` and pushes error logs directly to Datadog before placing the partition into the dead-letter queue (DLQ).",
    confidence: 94,
    citations: [
      { id: "c-glue-1", title: "Glue Job Runbook", type: "runbook", locator: "§3 Retry Policy & DLQ" },
      { id: "c-glue-2", title: "KT Session 2 — Data Pipeline", type: "video", locator: "24:15" },
    ],
    followups: ["How do I clear items from the Glue DLQ?", "Who receives SNS alert emails for pipeline failures?", "Can we adjust the exponential backoff parameters?"],
  },
  {
    keywords: ["vpc", "network", "peer", "peering", "timeout"],
    answer:
      "VPC Peering connection timeouts typically occur when inter-region route tables lack explicit destination CIDR entries or security groups block TCP port 443/5432 cross-VPC traffic. Check Transit Gateway route table attachments and ensure the security group `sg-0a8b9f71c` explicitly allows ingress from `10.200.0.0/16`.",
    confidence: 89,
    citations: [
      { id: "c-vpc-1", title: "VPC Networking Runbook", type: "runbook", locator: "§5 Inter-VPC Peering" },
      { id: "c-vpc-2", title: "Architecture Overview 2026", type: "pdf", locator: "p. 18" },
    ],
    followups: ["What is the CIDR range for staging VPC?", "How do I request a new VPC peering connection?", "Show me the Transit Gateway routing diagram"],
  },
  {
    keywords: ["incident", "sop", "escalate", "escalation", "emergency", "oncall"],
    answer:
      "For P1/P2 incidents, notify the primary Incident Commander via PagerDuty within 5 minutes. The IC will spin up a dedicated Zoom bridge (`#incident-room-p1`) and trigger the Slack workflow `/incident-escalate`. The SME on-call list is automatically populated based on affected services.",
    confidence: 95,
    citations: [
      { id: "c-inc-1", title: "Incident Response SOP", type: "runbook", locator: "§1 Severity Definitions & SLA" },
      { id: "c-inc-2", title: "Onboarding FAQ — Platform Team", type: "faq", locator: "Q4 Escalations" },
    ],
    followups: ["Who is the current IC on-call?", "What defines a P1 vs P2 incident?", "Where are post-mortem templates stored?"],
  },
  {
    keywords: ["architecture", "change", "overview", "2026"],
    answer:
      "The 2026 architecture migration transitioned our monolith billing backend into event-driven microservices running on EKS. Key changes include: 1) Replacing SQS polling with Kafka event streams, 2) Utilizing ChromaDB for SME knowledge vector embeddings, and 3) LangGraph agentic orchestration for real-time RAG query routing.",
    confidence: 91,
    citations: [
      { id: "c-arch-1", title: "Architecture Overview 2026", type: "architecture", locator: "p. 2–8" },
      { id: "c-arch-2", title: "KT Session 4 — Auth & Billing", type: "video", locator: "05:10" },
    ],
    followups: ["What vector embedding model is being used?", "How is state managed between LangGraph nodes?", "Where is the Kafka cluster hosted?"],
  },
];

function matchTopic(question: string) {
  const qLower = question.toLowerCase();
  return KNOWLEDGE_RESPONSES.find((kr) => kr.keywords.some((kw) => qLower.includes(kw)));
}

/** Real filter: does the question name a specific department? If so, scope retrieval to it. */
function matchDepartment(question: string): { department: string; items: KnowledgeItem[] } | null {
  const qLower = question.toLowerCase();
  const dept = DEPARTMENTS.find((d) => qLower.includes(d.toLowerCase()));
  if (!dept) return null;
  const items = knowledgeStore.byDepartment(dept);
  return { department: dept, items };
}

function itemsToCitations(items: KnowledgeItem[]): Citation[] {
  return items.slice(0, 4).map((item) => ({
    id: `c-${item.id}`,
    title: item.title,
    type: item.type,
    locator: `${item.department} · ${item.branch}`,
  }));
}

function buildDirectory(): string {
  return knowledgeStore
    .list()
    .map((i) => `- "${i.title}" — Department: ${i.department} · Branch: ${i.branch}${i.specification ? ` · Notes: ${i.specification}` : ""} (SME: ${i.sme})`)
    .join("\n");
}

function buildSystemPrompt(): string {
  return `${KNOWLEDGE_BASE_CONTEXT}

=== FULL DOCUMENT DIRECTORY (with department/branch tags — includes newly uploaded files) ===
${buildDirectory()}

When the person asks for documents or information from a specific department or branch,
ONLY reference documents from the directory above that actually match that department or
branch — never invent a department match. If asked about a department with no matching
documents in the directory, say so plainly rather than guessing.

Respond in 2-5 sentences unless the question needs more detail. Speak as Atlas: helpful,
precise, and grounded — never invent facts outside the sources above.`;
}

async function askLive(question: string, history: ChatMessage[]): Promise<ChatMessage> {
  const deptMatch = matchDepartment(question);
  const topicMatch = matchTopic(question);

  const conversationMessages = history
    .filter((m) => m.role === "user" || m.role === "atlas")
    .slice(-8)
    .map((m) => ({ role: (m.role === "atlas" ? "assistant" : "user") as "user" | "assistant", content: m.content }));

  const { text } = await callLLM(buildSystemPrompt(), [...conversationMessages, { role: "user", content: question }]);

  const citations = deptMatch
    ? itemsToCitations(deptMatch.items)
    : topicMatch?.citations ?? [{ id: `c-${Date.now()}-1`, title: "Customer Billing Pipeline v3.pdf", type: "pdf", locator: "grounded answer" }];

  return {
    id: `m-${Date.now()}`,
    role: "atlas",
    content: text,
    timestamp: new Date().toISOString(),
    confidence: deptMatch ? (deptMatch.items.length > 0 ? 93 : 60) : topicMatch?.confidence ?? 90,
    citations,
    followups: topicMatch?.followups ?? ["Can you go into more detail?", "What document is this sourced from?", "Show me related documents in Repository"],
  };
}

function askDemo(question: string): Promise<ChatMessage> {
  const deptMatch = matchDepartment(question);

  // Department-scoped question — answer directly from the real, structured
  // department filter rather than the scripted topic responses.
  if (deptMatch) {
    const { department, items } = deptMatch;
    if (items.length === 0) {
      return mockRequest(
        {
          id: `m-${Date.now()}`,
          role: "atlas",
          content: `I don't have any documents tagged to the ${department} department yet. Once an SME uploads one via Upload Center and tags it "${department}", I'll be able to surface it here.`,
          timestamp: new Date().toISOString(),
          confidence: 60,
          citations: [],
          followups: [`Show me all departments`, `Who can upload ${department} documents?`],
        },
        700
      );
    }

    const list = items.map((i) => `**${i.title}** (${i.branch}, SME: ${i.sme})`).join("\n- ");
    return mockRequest(
      {
        id: `m-${Date.now()}`,
        role: "atlas",
        content: `Found ${items.length} document${items.length !== 1 ? "s" : ""} tagged to the **${department}** department:\n\n- ${list}`,
        timestamp: new Date().toISOString(),
        confidence: 93,
        citations: itemsToCitations(items),
        followups: [`Summarize the ${department} documents`, `Who's the SME for ${department}?`, "Show me another department"],
      },
      800
    );
  }

  const topicMatch = matchTopic(question);
  if (topicMatch) {
    return mockRequest(
      {
        id: `m-${Date.now()}`,
        role: "atlas",
        content: topicMatch.answer,
        timestamp: new Date().toISOString(),
        confidence: topicMatch.confidence,
        citations: topicMatch.citations,
        followups: topicMatch.followups,
      },
      900
    );
  }

  return mockRequest(
    {
      id: `m-${Date.now()}`,
      role: "atlas",
      content: `[Demo mode — no live model connected] I analyzed your query: "${question}". Based on our indexed SME documents, here are the key insights:\n\n1. **Grounding & Context**: This request correlates with enterprise procedures in our knowledge base.\n2. **Try asking by department**: e.g. "show me documents from Analytics" to see real department-scoped retrieval.\n3. **Recommended Next Steps**: Connect a live LLM (top-right of this workspace) for real, open-ended answers.`,
      timestamp: new Date().toISOString(),
      confidence: 88,
      citations: [
        { id: `c-${Date.now()}-1`, title: "Customer Billing Pipeline v3.pdf", type: "pdf", locator: "p. 4–6" },
        { id: `c-${Date.now()}-2`, title: "Glue Job Runbook", type: "runbook", locator: "§2 Ingestion" },
      ],
      followups: ["Show me documents from Analytics", "Who is the SME for this topic?", "Show me related documents in Repository"],
    },
    1000
  );
}

export const chatService = {
  getSeedConversation: () => mockRequest(MOCK_CHAT_SEED),

  ask: async (question: string, history: ChatMessage[] = []): Promise<ChatMessage> => {
    if (hasLiveLLM()) {
      try {
        return await askLive(question, history);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          id: `m-${Date.now()}`,
          role: "atlas",
          content: `⚠️ The live model call failed (${message}). Falling back to demo mode for this answer — check your connection settings ("Connect LLM") and try again.`,
          timestamp: new Date().toISOString(),
          confidence: 50,
          citations: [],
          followups: ["Try that again", "Open Connect LLM settings"],
        };
      }
    }
    return askDemo(question);
  },
};
