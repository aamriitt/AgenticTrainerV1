import { motion } from "framer-motion";
import { AtlasAvatar } from "@/components/branding/atlas-avatar";

export function TypingIndicator() {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <AtlasAvatar size="md" thinking />
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">Atlas is gathering sources…</span>
    </div>
  );
}
