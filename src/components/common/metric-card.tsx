import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import type { MetricSummary } from "@/types";

interface MetricCardProps {
  metric: MetricSummary;
  icon?: LucideIcon;
  tone?: "indigo" | "blue" | "emerald" | "amber";
}

const TONE_CLASS: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  indigo: "bg-atlas-indigo/10 text-atlas-indigo",
  blue: "bg-atlas-blue/10 text-atlas-blue",
  emerald: "bg-success/10 text-success",
  amber: "bg-warning/10 text-warning",
};

export function MetricCard({ metric, icon: Icon, tone = "indigo" }: MetricCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="p-4">
        <div className="mb-2.5 flex items-center justify-between">
          {Icon && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE_CLASS[tone])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          {metric.deltaLabel && (
            <span
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold",
                metric.trend === "up" ? "text-success" : metric.trend === "down" ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {metric.trend === "up" && <TrendingUp className="h-3 w-3" />}
              {metric.trend === "down" && <TrendingDown className="h-3 w-3" />}
              {metric.deltaLabel}
            </span>
          )}
        </div>
        <div className="text-xl font-extrabold">{metric.value}</div>
        <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{metric.label}</div>
      </Card>
    </motion.div>
  );
}
