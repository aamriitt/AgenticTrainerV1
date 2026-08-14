import { useMemo, useState } from "react";
import { Filter, Grid3x3, List, Plus, ArrowUpDown, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { repositoryService } from "@/services/repository.service";
import { SearchBar } from "@/components/common/search-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KnowledgeCard } from "@/components/knowledge/knowledge-card";
import { DocumentPreview } from "@/components/knowledge/document-preview";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DEPARTMENTS } from "@/constants/departments";
import { cn } from "@/utils/cn";
import type { KnowledgeItem, KnowledgeType } from "@/types";

const TABS: Array<{ label: string; value: KnowledgeType | "all" }> = [
  { label: "All", value: "all" },
  { label: "PDFs", value: "pdf" },
  { label: "Training videos", value: "video" },
  { label: "Runbooks", value: "runbook" },
  { label: "FAQs", value: "faq" },
  { label: "Architecture docs", value: "architecture" },
  { label: "Transcripts", value: "transcript" },
];

export function RepositoryPage() {
  const navigate = useNavigate();
  const { data: items, isLoading } = useQuery({ queryKey: ["repository"], queryFn: repositoryService.list });

  const [tab, setTab] = useState<KnowledgeType | "all">("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<KnowledgeItem | null>(null);
  const [selectedSme, setSelectedSme] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"title" | "date">("title");

  const smes = useMemo(() => (items ? Array.from(new Set(items.map((i) => i.sme))) : []), [items]);

  const filtered = useMemo(() => {
    let result = (items ?? []).filter((it) => {
      const matchesTab = tab === "all" || it.type === tab;
      const matchesQuery = it.title.toLowerCase().includes(query.toLowerCase()) || it.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
      const matchesSme = selectedSme === "all" || it.sme === selectedSme;
      const matchesDept = selectedDept === "all" || it.department === selectedDept;
      return matchesTab && matchesQuery && matchesSme && matchesDept;
    });

    result = sortOrder === "title"
      ? [...result].sort((a, b) => a.title.localeCompare(b.title))
      : [...result].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return result;
  }, [items, tab, query, selectedSme, selectedDept, sortOrder]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3.5">
        <SearchBar value={query} onChange={setQuery} placeholder="Search documents, tags, SMEs…" className="w-full max-w-[360px]" />

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none cursor-pointer"
          >
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={selectedSme}
            onChange={(e) => setSelectedSme(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none cursor-pointer"
          >
            <option value="all">All SMEs</option>
            {smes.map((sme) => (
              <option key={sme} value={sme}>{sme}</option>
            ))}
          </select>

          <Button variant="secondary" size="sm" onClick={() => setSortOrder((prev) => (prev === "title" ? "date" : "title"))} className="rounded-xl text-xs gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5" /> Sort: {sortOrder === "title" ? "Name" : "Date"}
          </Button>

          <div className="flex overflow-hidden rounded-xl border border-border bg-card">
            <button onClick={() => setView("list")} className={cn("flex h-8 w-8 items-center justify-center transition-colors", view === "list" ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground")} title="List View">
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setView("grid")} className={cn("flex h-8 w-8 items-center justify-center transition-colors", view === "grid" ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground")} title="Grid View">
              <Grid3x3 className="h-4 w-4" />
            </button>
          </div>

          <Button onClick={() => navigate("/upload")} className="rounded-xl gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Add Knowledge
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs",
              tab === t.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center rounded-2xl border-dashed">
          <p className="text-sm font-semibold text-muted-foreground">No knowledge items match your search filters.</p>
          <Button variant="secondary" size="sm" onClick={() => { setQuery(""); setTab("all"); setSelectedSme("all"); setSelectedDept("all"); }} className="mt-3 rounded-xl">
            Reset Filters
          </Button>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => <KnowledgeCard key={item.id} item={item} onClick={() => setPreview(item)} />)}
        </div>
      ) : (
        <Card className="overflow-hidden border border-border/80 shadow-xs">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/60 text-left border-b border-border">
                {["Title", "Department", "SME Owner", "Uploaded Date", "Status", "Vector Embedding"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} onClick={() => setPreview(item)} className="cursor-pointer border-t border-border/60 transition-colors hover:bg-secondary/40">
                  <td className="px-4 py-3.5 font-bold text-foreground">{item.title}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant="indigo" className="gap-1"><Building2 className="h-3 w-3" /> {item.department}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground font-medium">{item.sme}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{new Date(item.uploadedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3.5"><StatusBadge status={item.embeddingStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <DocumentPreview item={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
