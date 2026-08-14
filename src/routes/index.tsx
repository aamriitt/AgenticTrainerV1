import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/layouts/app-layout";
import { AtlasLoading } from "@/components/branding/atlas-loading";
import { LoginSelectPage } from "@/pages/login-select-page";
import { LoginPage } from "@/pages/login-page";
import { AdminLoginPage } from "@/pages/admin-login-page";
import { NotFoundPage } from "@/pages/not-found-page";

// Every feature surface is route-split so the initial bundle stays lean —
// only the Dashboard (the landing page) loads eagerly.
import { DashboardPage } from "@/features/dashboard/dashboard-page";
const AtlasWorkspacePage = lazy(() => import("@/features/chat/atlas-workspace-page").then((m) => ({ default: m.AtlasWorkspacePage })));
const TechRefreshPage = lazy(() => import("@/features/rebootx/tech-refresh-page").then((m) => ({ default: m.TechRefreshPage })));
const RepositoryPage = lazy(() => import("@/features/repository/repository-page").then((m) => ({ default: m.RepositoryPage })));
const UploadCenterPage = lazy(() => import("@/features/upload/upload-center-page").then((m) => ({ default: m.UploadCenterPage })));
const PipelineMonitorPage = lazy(() => import("@/features/pipeline/pipeline-monitor-page").then((m) => ({ default: m.PipelineMonitorPage })));
const AgentMonitorPage = lazy(() => import("@/features/agents/agent-monitor-page").then((m) => ({ default: m.AgentMonitorPage })));
const AnalyticsPage = lazy(() => import("@/features/analytics/analytics-page").then((m) => ({ default: m.AnalyticsPage })));
const ConversationHistoryPage = lazy(() => import("@/features/history/conversation-history-page").then((m) => ({ default: m.ConversationHistoryPage })));
const KnowledgeGraphPage = lazy(() => import("@/features/graph/knowledge-graph-page").then((m) => ({ default: m.KnowledgeGraphPage })));
const AdminPage = lazy(() => import("@/features/admin/admin-page").then((m) => ({ default: m.AdminPage })));

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<AtlasLoading label="Atlas is loading this workspace" />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginSelectPage /> },
  { path: "/login/user", element: <LoginPage /> },
  { path: "/login/admin", element: <AdminLoginPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "atlas", element: withSuspense(<AtlasWorkspacePage />) },
      { path: "refresh", element: withSuspense(<TechRefreshPage />) },
      { path: "repository", element: withSuspense(<RepositoryPage />) },
      { path: "upload", element: withSuspense(<UploadCenterPage />) },
      // Admin-only surfaces — also enforced by a role guard in AppLayout.
      { path: "pipeline", element: withSuspense(<PipelineMonitorPage />) },
      { path: "agents", element: withSuspense(<AgentMonitorPage />) },
      { path: "analytics", element: withSuspense(<AnalyticsPage />) },
      { path: "history", element: withSuspense(<ConversationHistoryPage />) },
      { path: "graph", element: withSuspense(<KnowledgeGraphPage />) },
      { path: "admin", element: withSuspense(<AdminPage />) },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
