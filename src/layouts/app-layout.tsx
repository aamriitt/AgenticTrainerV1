import { useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { pageTransition } from "@/animations/variants";
import { useAuth } from "@/contexts/auth-context";
import { ADMIN_ONLY_PATHS } from "@/constants/navigation";

/** Shell used by every authenticated route: sidebar + top bar + animated page outlet. */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isAtlasWorkspace = location.pathname.startsWith("/atlas");

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin-only surfaces (Analytics, Agent monitor, Pipeline monitor, Admin) are
  // hidden from regular users — guard the route in addition to hiding the nav link.
  const isAdminOnlyPath = ADMIN_ONLY_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
  if (isAdminOnlyPath && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar sidebarCollapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className="flex-1 overflow-y-auto">
          <div className={isAtlasWorkspace ? "h-full" : "mx-auto max-w-[1280px] px-6 py-7 pb-14 md:px-8"}>
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} variants={pageTransition} initial="initial" animate="animate" exit="exit" className="h-full">
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
