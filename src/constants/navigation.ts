import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/types";
import {
  LayoutGrid,
  MessagesSquare,
  Library,
  UploadCloud,
  Workflow,
  BotMessageSquare,
  BarChart3,
  History,
  Share2,
  ShieldCheck,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Which app roles can see this nav entry / route.
   * admin: everything. sme: everything except admin-only ops surfaces.
   * user: Ask Atlas + Dashboard + History + Graph only — no Repository, no Upload. */
  roles: AppRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutGrid, roles: ["admin", "sme", "user"] },
  { path: "/atlas", label: "Ask Atlas", icon: MessagesSquare, roles: ["admin", "sme", "user"] },
  { path: "/repository", label: "Knowledge repository", icon: Library, roles: ["admin", "sme"] },
  { path: "/upload", label: "Upload center", icon: UploadCloud, roles: ["admin", "sme"] },
  { path: "/pipeline", label: "Pipeline monitor", icon: Workflow, roles: ["admin"] },
  { path: "/agents", label: "Agent monitor", icon: BotMessageSquare, roles: ["admin"] },
  { path: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin"] },
  { path: "/history", label: "Conversation history", icon: History, roles: ["admin", "sme", "user"] },
  { path: "/graph", label: "Knowledge graph", icon: Share2, roles: ["admin", "sme", "user"] },
  { path: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin"] },
];

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  sme: "SME",
  user: "User",
};

/** Returns the roles allowed to view a given pathname, or null if the path isn't nav-guarded. */
export function getAllowedRoles(pathname: string): AppRole[] | null {
  const match = NAV_ITEMS.find((item) =>
    item.path === "/" ? pathname === "/" : pathname === item.path || pathname.startsWith(`${item.path}/`)
  );
  return match ? match.roles : null;
}
