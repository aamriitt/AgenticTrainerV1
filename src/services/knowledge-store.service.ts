import { MOCK_KNOWLEDGE_ITEMS } from "@/constants/mock-data";
import type { KnowledgeItem } from "@/types";

/**
 * Merges the seed knowledge base with anything uploaded during this session
 * (persisted to localStorage so it survives a refresh). This is what lets
 * newly-uploaded, department-tagged documents actually show up in the
 * Repository and be retrievable by Ask Atlas — a real, if simple, store.
 */
const STORAGE_KEY = "atlas-trainer-uploaded-knowledge";

function readUploaded(): KnowledgeItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KnowledgeItem[]) : [];
  } catch {
    return [];
  }
}

function writeUploaded(items: KnowledgeItem[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const knowledgeStore = {
  list(): KnowledgeItem[] {
    return [...readUploaded(), ...MOCK_KNOWLEDGE_ITEMS];
  },
  add(item: KnowledgeItem): void {
    const items = readUploaded();
    items.unshift(item);
    writeUploaded(items);
  },
  byDepartment(department: string): KnowledgeItem[] {
    const target = department.toLowerCase();
    return this.list().filter((i) => i.department?.toLowerCase() === target);
  },
};
