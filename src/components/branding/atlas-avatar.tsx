import { motion } from "framer-motion";
import { AtlasLogoMark } from "./atlas-logo";
import { cn } from "@/utils/cn";

type AtlasAvatarSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<AtlasAvatarSize, { box: number; mark: number }> = {
  sm: { box: 28, mark: 15 },
  md: { box: 36, mark: 19 },
  lg: { box: 48, mark: 25 },
};

interface AtlasAvatarProps {
  size?: AtlasAvatarSize;
  thinking?: boolean;
  className?: string;
}

export function AtlasAvatar({ size = "md", thinking = false, className }: AtlasAvatarProps) {
  const dims = SIZE_MAP[size];
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15",
        className
      )}
      style={{ width: dims.box, height: dims.box }}
    >
      {thinking && (
        <motion.span
          className="absolute inset-0 rounded-full ring-2 ring-primary/40"
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <AtlasLogoMark tone="color" size={dims.mark} animated={thinking} />
    </div>
  );
}
