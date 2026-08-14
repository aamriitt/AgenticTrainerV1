import { apiRequest } from "./api-client";
import type { KnowledgeItem, KnowledgeType } from "@/types";

interface SourceItem {
  id: string;
  title: string;
  path: string;
  type: string;
  size_bytes: number;
  updated_at: number;
}

interface SourcesResponse {
  items: SourceItem[];
  count: number;
  vectors_stored: number;
}

function mapType(ext: string, path: string): KnowledgeType {
  const p = path.toLowerCase();
  if (p.includes("/faq/") || ext === "txt" || ext === "md") return "faq";
  if (p.includes("/sop/") || ext === "docx") return "runbook";
  if (p.includes("/videos/") || ["mp4", "mov", "mkv", "wav", "mp3"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return "architecture";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function toKnowledgeItem(src: SourceItem): KnowledgeItem {
  const ext = (src.type || "").toLowerCase();
  return {
    id: src.id,
    title: src.title,
    type: mapType(ext, src.path),
    sme: "Knowledge Base",
    uploadedAt: new Date((src.updated_at || 0) * 1000).toISOString(),
    tags: [src.path.split("/")[0] || "knowledge", ext || "file"].filter(Boolean),
    status: "active",
    embeddingStatus: "complete",
    lastIndexedAt: new Date((src.updated_at || 0) * 1000).toISOString(),
    sizeLabel: formatBytes(src.size_bytes || 0),
  };
}

export const repositoryService = {
  list: async (): Promise<KnowledgeItem[]> => {
    const data = await apiRequest<SourcesResponse>("/sources");
    return (data.items ?? []).map(toKnowledgeItem);
  },
};
