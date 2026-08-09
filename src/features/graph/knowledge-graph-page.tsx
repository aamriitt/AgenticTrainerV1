import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ZoomIn, ZoomOut, RotateCcw, Search, Sparkles, ExternalLink, Network, FileText } from "lucide-react";
import { graphService } from "@/services/graph.service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/common/search-bar";
import { KnowledgeGraphNodeMark, NODE_TYPE_COLOR } from "@/components/graph/knowledge-graph-node";
import { useToast } from "@/contexts/toast-context";
import type { GraphNodeType } from "@/types";

const LEGEND: Array<{ type: GraphNodeType; label: string }> = [
  { type: "document", label: "Document" },
  { type: "runbook", label: "Runbook" },
  { type: "video", label: "Video" },
  { type: "topic", label: "Topic" },
  { type: "sme", label: "SME" },
  { type: "faq", label: "FAQ" },
];

export function KnowledgeGraphPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: nodes, isLoading: nodesLoading } = useQuery({ queryKey: ["graph", "nodes"], queryFn: graphService.getNodes });
  const { data: edges } = useQuery({ queryKey: ["graph", "edges"], queryFn: graphService.getEdges });

  const [selected, setSelected] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<GraphNodeType | "all">("all");
  const [query, setQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);

  const connected = useMemo(() => {
    if (!selected || !edges) return new Set<string>();
    const set = new Set<string>([selected]);
    edges.forEach((e) => {
      if (e.source === selected) set.add(e.target);
      if (e.target === selected) set.add(e.source);
    });
    return set;
  }, [selected, edges]);

  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    return nodes.filter((n) => {
      const matchesFilter = activeFilter === "all" || n.type === activeFilter;
      const matchesQuery = n.label.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [nodes, activeFilter, query]);

  const selectedNode = nodes?.find((n) => n.id === selected);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(prev + delta, 0.7), 1.6));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setSelected(null);
    setActiveFilter("all");
    setQuery("");
  };

  const handleAskAboutNode = () => {
    if (!selectedNode) return;
    toast({
      title: "Opening Ask Atlas",
      description: `Targeting graph topic: ${selectedNode.label}`,
      type: "info",
    });
    navigate("/atlas");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Network className="h-4 w-4 text-atlas-indigo" /> Enterprise SME Knowledge Graph
          </h2>
          <p className="text-xs text-muted-foreground">Trace semantic relationships across documents, SMEs, runbooks, and topics</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={query} onChange={setQuery} placeholder="Search graph node…" className="w-[200px]" />

          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                activeFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "bg-card border border-border text-muted-foreground"
              }`}
            >
              All
            </button>
            {LEGEND.map((l) => (
              <button
                key={l.type}
                onClick={() => setActiveFilter(l.type)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                  activeFilter === l.type ? "bg-primary text-primary-foreground font-bold" : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="relative h-[560px] overflow-hidden p-4 border border-border/80 shadow-xs bg-slate-950/20">
          <div className="absolute top-4 right-4 z-10 flex gap-1 rounded-xl border border-border bg-card/90 p-1 shadow-md backdrop-blur-xs">
            <Button variant="ghost" size="icon" onClick={() => handleZoom(0.15)} className="h-7 w-7" title="Zoom In">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleZoom(-0.15)} className="h-7 w-7" title="Zoom Out">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleResetZoom} className="h-7 w-7" title="Reset Graph Canvas">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {nodesLoading || !nodes || !edges ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
            <svg
              viewBox="0 0 780 400"
              className="h-full w-full transition-transform duration-300 ease-out"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {edges.map((edge, i) => {
                const n1 = nodes.find((n) => n.id === edge.source)!;
                const n2 = nodes.find((n) => n.id === edge.target)!;
                if (!n1 || !n2) return null;
                const dim = selected ? !(connected.has(edge.source) && connected.has(edge.target)) : false;
                return (
                  <line
                    key={i}
                    x1={n1.x}
                    y1={n1.y}
                    x2={n2.x}
                    y2={n2.y}
                    stroke={dim ? "hsl(220 20% 90% / 0.3)" : "hsl(243 75% 59% / 0.4)"}
                    strokeWidth={dim ? 1 : 1.8}
                    strokeDasharray={edge.source.includes("sme") ? "4 4" : undefined}
                  />
                );
              })}
              {filteredNodes.map((node) => (
                <KnowledgeGraphNodeMark
                  key={node.id}
                  node={node}
                  dimmed={Boolean(selected) && !connected.has(node.id)}
                  selected={selected === node.id}
                  onSelect={(id) => setSelected((prev) => (prev === id ? null : id))}
                />
              ))}
            </svg>
          )}
        </Card>

        <div className="flex flex-col gap-3.5">
          <Card className="p-4 border border-border/80">
            <h3 className="mb-2.5 text-[13px] font-bold text-foreground">Graph Legend</h3>
            <div className="grid grid-cols-2 gap-2">
              {LEGEND.map((l) => (
                <div key={l.type} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: NODE_TYPE_COLOR[l.type] }} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 border border-border/80 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="mb-2 text-[13px] font-bold text-foreground">
                {selectedNode ? "Selected Graph Node" : "Node Inspector"}
              </h3>
              {selectedNode ? (
                <div>
                  <div className="mb-1.5 text-sm font-extrabold text-foreground">{selectedNode.label}</div>
                  <Badge variant="indigo" className="capitalize">{selectedNode.type}</Badge>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">{connected.size - 1}</strong> connected knowledge item{connected.size - 1 !== 1 ? "s" : ""} highlighted on the canvas.
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Click any node on the canvas to highlight semantic relationships across SME authors, training videos, runbooks, and vector topics.
                </p>
              )}
            </div>

            {selectedNode && (
              <div className="mt-4 pt-3 border-t border-border">
                <Button onClick={handleAskAboutNode} className="w-full rounded-xl gap-2 text-xs shadow-xs">
                  <Sparkles className="h-3.5 w-3.5" /> Ask Atlas About Node
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
