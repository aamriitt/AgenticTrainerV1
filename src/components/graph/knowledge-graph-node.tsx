import { cn } from "@/utils/cn";
import type { GraphNode, GraphNodeType } from "@/types";

export const NODE_TYPE_COLOR: Record<GraphNodeType, string> = {
  document: "hsl(243 75% 59%)",
  runbook: "hsl(217 91% 55%)",
  video: "hsl(350 84% 48%)",
  topic: "hsl(158 84% 32%)",
  sme: "hsl(32 94% 43%)",
  faq: "hsl(262 60% 55%)",
};

interface KnowledgeGraphNodeProps {
  node: GraphNode;
  dimmed: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function KnowledgeGraphNodeMark({ node, dimmed, selected, onSelect }: KnowledgeGraphNodeProps) {
  return (
    <g onClick={() => onSelect(node.id)} className={cn("cursor-pointer", "transition-opacity")}>
      <circle
        cx={node.x}
        cy={node.y}
        r={selected ? 16 : 12}
        fill={dimmed ? "hsl(220 20% 88%)" : NODE_TYPE_COLOR[node.type]}
        opacity={dimmed ? 0.55 : 1}
        stroke="hsl(var(--card))"
        strokeWidth={2}
      />
      <text
        x={node.x}
        y={node.y + 26}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight={600}
        fill={dimmed ? "hsl(220 10% 75%)" : "hsl(var(--foreground))"}
      >
        {node.label}
      </text>
    </g>
  );
}
