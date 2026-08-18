import { useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import { pageTransition } from "@/animations/variants";
import { useAuth } from "@/contexts/auth-context";
import { getAllowedRoles } from "@/constants/navigation";

/** Shell used by every authenticated route: sidebar + top bar + animated page outlet. */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isAtlasWorkspace = location.pathname.startsWith("/atlas");

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Every nav-guarded route (Repository/Upload for SME+, Pipeline/Agents/Analytics/Admin
  // for admin-only) is enforced here too — not just hidden in the sidebar.
  const allowedRoles = getAllowedRoles(location.pathname);
  if (allowedRoles && !allowedRoles.includes(user.role)) {
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
