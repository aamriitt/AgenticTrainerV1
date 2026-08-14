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
  RefreshCw,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Which app roles can see this nav entry / route. Admin-only surfaces are hidden for "user". */
  roles: AppRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutGrid, roles: ["admin", "user"] },
  { path: "/atlas", label: "Ask Atlas", icon: MessagesSquare, roles: ["admin", "user"] },
  { path: "/refresh", label: "Tech refresh", icon: RefreshCw, roles: ["admin", "user"] },
  { path: "/repository", label: "Knowledge repository", icon: Library, roles: ["admin", "user"] },
  { path: "/upload", label: "Upload center", icon: UploadCloud, roles: ["admin", "user"] },
  { path: "/pipeline", label: "Pipeline monitor", icon: Workflow, roles: ["admin"] },
  { path: "/agents", label: "Agent monitor", icon: BotMessageSquare, roles: ["admin"] },
  { path: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin"] },
  { path: "/history", label: "Conversation history", icon: History, roles: ["admin", "user"] },
  { path: "/graph", label: "Knowledge graph", icon: Share2, roles: ["admin", "user"] },
  { path: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin"] },
];

/** Admin-only route paths — enforced both in the sidebar and as a route guard. */
export const ADMIN_ONLY_PATHS = NAV_ITEMS.filter((i) => !i.roles.includes("user")).map((i) => i.path);
