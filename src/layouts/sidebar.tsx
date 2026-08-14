import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { NAV_ITEMS, ROLE_LABEL } from "@/constants/navigation";
import { AtlasLogoMark, AtlasWordmark } from "@/components/branding/atlas-logo";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter((item) => (user ? item.roles.includes(user.role) : false));

  const handleLogout = () => {
    logout();
    toast({ title: "Signed out", description: "Come back any time.", type: "info" });
    navigate("/login");
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="hidden h-full flex-shrink-0 flex-col border-r border-border bg-card md:flex"
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <AtlasLogoMark tone="color" size={30} />
        {!collapsed && (
          <div>
            <AtlasWordmark />
            <div className="text-[10px] font-semibold text-muted-foreground">Agentic Trainer</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.3px] font-medium text-muted-foreground transition-colors hover:bg-secondary",
                isActive && "bg-primary/10 font-bold text-primary hover:bg-primary/10"
              )
            }
          >
            <item.icon className="h-[17px] w-[17px] flex-shrink-0" strokeWidth={2.1} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3.5">
        {user && (
          <div className="mb-2.5 rounded-xl bg-secondary p-3">
            <div className="mb-1.5 flex items-center justify-between">
              {!collapsed && <span className="text-[11px] font-bold text-muted-foreground">System health</span>}
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success shadow-[0_0_0_3px_hsl(var(--success)/0.15)]" />
            </div>
            {!collapsed && (
              <>
                <div className="text-xs font-semibold">All pipelines nominal</div>
                <div className="mt-0.5 text-[10.5px] text-muted-foreground">Atlas is online across every service</div>
              </>
            )}
          </div>
        )}

        {user && (
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive",
              collapsed && "justify-center"
            )}
            title="Log out"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && (
              <span className="flex items-center gap-1.5 truncate">
                Log out
                <span className="ml-auto flex items-center gap-1 rounded-full bg-card border border-border px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-muted-foreground">
                  {user.role === "admin" ? <ShieldCheck className="h-2.5 w-2.5" /> : <UserIcon className="h-2.5 w-2.5" />}
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
            )}
          </button>
        )}
      </div>
    </motion.aside>
  );
}
