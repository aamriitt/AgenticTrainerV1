import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, ChevronDown, Building2, PanelLeftClose, PanelLeft, Sun, Moon, Search, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { NAV_ITEMS, ROLE_LABEL } from "@/constants/navigation";
import { Button } from "@/components/ui/button";
import { AtlasAvatar } from "@/components/branding/atlas-avatar";
import { CommandPalette } from "@/components/common/command-palette";
import { NotificationsDropdown } from "@/components/common/notifications-dropdown";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/contexts/toast-context";
import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ sidebarCollapsed, onToggleSidebar }: TopBarProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const current = NAV_ITEMS.find((item) =>
    item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)
  );

  const handleToggleTheme = () => {
    toggleTheme();
    toast({
      title: `Switched to ${theme === "dark" ? "Light" : "Dark"} Mode`,
      type: "info",
    });
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
    toast({ title: "Signed out", description: "Come back any time.", type: "info" });
    navigate("/login");
  };

  return (
    <header className="relative flex h-[60px] flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-card/90 px-6 backdrop-blur-xs z-30">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="hidden md:inline-flex rounded-xl">
          {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
        <h1 className="whitespace-nowrap text-[15px] font-extrabold text-foreground tracking-tight">
          {current?.label ?? "Agentic Trainer"}
        </h1>
        <div className="hidden items-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground lg:flex">
          <Building2 className="h-3.5 w-3.5" /> TCS Enterprise <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </div>

      <div
        onClick={() => setIsCmdOpen(true)}
        className="hidden max-w-[420px] flex-1 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-secondary/60 transition-all md:flex"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1">Ask Atlas, search documents, agents…</span>
        <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
          Ctrl K
        </kbd>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleToggleTheme} aria-label="Toggle theme" className="rounded-xl">
          {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            aria-label="Notifications"
            className="relative rounded-xl"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive shadow-[0_0_0_2px_hsl(var(--card))]" />
          </Button>

          <NotificationsDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        </div>

        <div className="h-[22px] w-px bg-border mx-1" />

        <div className="relative">
          <div
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1 hover:bg-secondary transition-colors"
          >
            <AtlasAvatar size="sm" />
            <span className="hidden text-xs font-bold text-foreground sm:inline">{user?.name ?? "Guest"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-border/80 bg-card p-3 shadow-2xl"
                >
                  <div className="mb-2 flex items-center gap-2.5 border-b border-border pb-2.5 px-1">
                    <AtlasAvatar size="sm" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-foreground">{user?.name}</div>
                      <div className="truncate text-[10.5px] text-muted-foreground">{user?.email}</div>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center gap-1.5 px-1 text-[10.5px] font-bold uppercase text-muted-foreground">
                    {user?.role === "admin" ? <ShieldCheck className="h-3 w-3 text-primary" /> : <UserIcon className="h-3 w-3 text-primary" />}
                    Signed in as {user ? ROLE_LABEL[user.role] : ""}
                  </div>
                  <button
                    onClick={() => {
                      setIsCmdOpen(true);
                      setIsProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                  >
                    <Search className="h-3.5 w-3.5" /> Open command palette
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Log out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} />
    </header>
  );
}
