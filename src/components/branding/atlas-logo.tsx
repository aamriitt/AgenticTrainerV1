import { cn } from "@/utils/cn";

export type AtlasLogoTone = "color" | "mono" | "white" | "dark";
export type AtlasLogoVariant = "mark" | "full";

interface AtlasLogoProps {
  variant?: AtlasLogoVariant;
  tone?: AtlasLogoTone;
  size?: number;
  animated?: boolean;
  className?: string;
}

const TONE_NODE: Record<AtlasLogoTone, string> = {
  color: "fill-atlas-indigo",
  mono: "fill-foreground",
  white: "fill-white",
  dark: "fill-slate-900",
};

const TONE_A: Record<AtlasLogoTone, string> = {
  color: "fill-foreground",
  mono: "fill-foreground",
  white: "fill-white",
  dark: "fill-slate-900",
};

const TONE_LINE: Record<AtlasLogoTone, string> = {
  color: "stroke-border",
  mono: "stroke-border",
  white: "stroke-white/35",
  dark: "stroke-slate-900/25",
};

const NODES = [0, 60, 120, 180, 240, 300].map((deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    cx: 32 + 25 * Math.cos(rad),
    cy: 32 + 25 * Math.sin(rad),
  };
});

export function AtlasLogoMark({ tone = "color", size = 32, animated = false, className }: Omit<AtlasLogoProps, "variant">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn(className)}
      role="img"
      aria-label="Atlas"
    >
      <g className={cn(TONE_LINE[tone], animated && "animate-glow-pulse")} strokeWidth={1.4}>
        {NODES.map((n, i) => (
          <line key={i} x1={32} y1={32} x2={n.cx} y2={n.cy} />
        ))}
      </g>

      <g className={cn(animated && "animate-node-pulse")}>
        {NODES.map((n, i) => (
          <circle key={i} cx={n.cx} cy={n.cy} r={4} className={TONE_NODE[tone]} />
        ))}
      </g>

      <g className={cn(animated && "origin-center animate-compass-spin")}>
        <path
          d="M32 14 L44 46 L37.5 46 L34.6 38 L29.4 38 L26.5 46 L20 46 Z M31.2 32.4 H32.8 L32 24.8 Z"
          fillRule="evenodd"
          className={TONE_A[tone]}
        />
        <circle cx={32} cy={32} r={2.4} className={TONE_NODE[tone]} />
      </g>
    </svg>
  );
}

export function AtlasWordmark({ tone = "color", className }: { tone?: AtlasLogoTone; className?: string }) {
  const textTone = tone === "white" ? "text-white" : tone === "dark" ? "text-slate-900" : "text-foreground";
  return (
    <span className={cn("font-semibold tracking-tight text-[15px] leading-none", textTone, className)}>
      Atlas
    </span>
  );
}

export function AtlasLogo({ variant = "full", tone = "color", size = 28, animated = false, className }: AtlasLogoProps) {
  if (variant === "mark") {
    return <AtlasLogoMark tone={tone} size={size} animated={animated} className={className} />;
  }
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <AtlasLogoMark tone={tone} size={size} animated={animated} />
      <AtlasWordmark tone={tone} />
    </div>
  );
}
