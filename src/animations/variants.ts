import type { Variants } from "framer-motion";

/** Shared Framer Motion variants so page/component transitions stay consistent. */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
};

export const sidebarWidth: Variants = {
  expanded: { width: 248, transition: { duration: 0.25, ease: "easeInOut" } },
  collapsed: { width: 76, transition: { duration: 0.25, ease: "easeInOut" } },
};
