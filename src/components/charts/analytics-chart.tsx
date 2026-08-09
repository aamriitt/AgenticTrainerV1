import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

const tooltipStyle = {
  background: "hsl(222 47% 11%)",
  border: "none",
  borderRadius: 10,
  fontSize: 12,
  padding: "8px 12px",
  color: "#fff",
};

const gridStroke = "hsl(220 20% 91%)";
const axisTick = { fontSize: 11, fill: "hsl(215 16% 47%)" };

interface ChartShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ChartShell({ title, subtitle, children }: ChartShellProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function TrendAreaChart({ data, dataKey = "value", color = "hsl(243 75% 59%)" }: { data: Array<Record<string, string | number>>; dataKey?: string; color?: string }) {
  const gradientId = `grad-${dataKey}-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data, dataKey = "value", color = "hsl(158 84% 32%)", domain }: { data: Array<Record<string, string | number>>; dataKey?: string; color?: string; domain?: [number, number] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis domain={domain} tick={axisTick} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RankedBarChart({ data, dataKey = "value", color = "hsl(217 91% 55%)", horizontal = true }: { data: Array<Record<string, string | number>>; dataKey?: string; color?: string; horizontal?: boolean }) {
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid horizontal={false} stroke={gridStroke} />
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={130} tick={{ ...axisTick, fontSize: 10.5 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey={dataKey} fill={color} radius={[0, 6, 6, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke={gridStroke} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["hsl(158 84% 32%)", "hsl(32 94% 43%)", "hsl(350 84% 48%)"];

export function DistributionPieChart({ data }: { data: Array<{ label: string; value: number }> }) {
  return (
    <div className="flex items-center gap-5">
      <ResponsiveContainer width="55%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={45} outerRadius={70} paddingAngle={3}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-bold">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
