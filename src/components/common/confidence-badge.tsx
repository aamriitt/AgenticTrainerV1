import { Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ConfidenceBadge({ value }: { value: number }) {
  const variant = value >= 85 ? "emerald" : value >= 65 ? "amber" : "rose";
  return (
    <Badge variant={variant}>
      <Gauge className="h-3 w-3" />
      {value}% confidence
    </Badge>
  );
}
