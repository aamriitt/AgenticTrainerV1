import { motion } from "framer-motion";
import { AtlasLogoMark } from "./atlas-logo";

export function AtlasLoading({ label = "Atlas is getting ready" }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <AtlasLogoMark tone="color" size={56} animated />
      </motion.div>
      <motion.p
        className="text-sm font-medium text-muted-foreground"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {label}
      </motion.p>
    </div>
  );
}
