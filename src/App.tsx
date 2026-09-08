// TrackLead OS — root: providers, routing, and RBAC guards.
import { useEffect, type ReactNode } from "react";
import { AuthProvider, canAccess, roleHome, useAuth } from "./lib/auth";
import { RouterProvider, useRouter } from "./lib/router";
import { AppShell } from "./components/AppShell";

import Landing from "./routes/public/Landing";
import Auth from "./routes/public/Auth";
import Legal from "./routes/public/Legal";
import PublicWidget from "./routes/public/Widget";

import Dashboard from "./routes/workspace/Dashboard";
import Pipeline from "./routes/workspace/Pipeline";
import Radar from "./routes/workspace/Radar";
import Campaigns from "./routes/workspace/Campaigns";
import Widgets from "./routes/workspace/Widgets";
import Settings from "./routes/workspace/Settings";
import Support from "./routes/workspace/Support";

import {
  AdminBilling,
  AdminDashboard,
  AdminPlans,
  AdminSupport,
  AdminTenants,
  AdminUsers,
} from "./routes/admin/Admin";

function Protected({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const { path, navigate } = useRouter();

  useEffect(() => {
    if (!role) navigate("/login");
    else if (!canAccess(role, path)) navigate(roleHome[role]);
  }, [role, path, navigate]);

  if (!role || !canAccess(role, path)) return null;
  return <AppShell>{children}</AppShell>;
}

function Routes() {
  const { path } = useRouter();

  // Public routes
  if (path === "/" ) return <Landing />;
  if (path === "/login") return <Auth mode="login" />;
  if (path === "/signup") return <Auth mode="signup" />;
  if (path === "/forgot") return <Auth mode="forgot" />;
  if (path === "/verify") return <Auth mode="verify" />;
  if (path === "/terms") return <Legal kind="terms" />;
  if (path === "/privacy") return <Legal kind="privacy" />;
  if (path.startsWith("/w/")) return <PublicWidget id={path.slice(3)} />;

  // Workspace owner
  if (path === "/app") return <Protected><Dashboard /></Protected>;
  if (path === "/app/pipeline") return <Protected><Pipeline /></Protected>;
  if (path === "/app/radar") return <Protected><Radar /></Protected>;
  if (path === "/app/campaigns") return <Protected><Campaigns /></Protected>;
  if (path === "/app/widgets") return <Protected><Widgets /></Protected>;
  if (path === "/app/settings") return <Protected><Settings /></Protected>;
  if (path === "/app/support") return <Protected><Support /></Protected>;

  // Staff
  if (path === "/staff") return <Protected><Pipeline staff /></Protected>;
  if (path === "/staff/radar") return <Protected><Radar staff /></Protected>;
  if (path === "/staff/support") return <Protected><Support /></Protected>;

  // Super admin
  if (path === "/admin") return <Protected><AdminDashboard /></Protected>;
  if (path === "/admin/tenants") return <Protected><AdminTenants /></Protected>;
  if (path === "/admin/users") return <Protected><AdminUsers /></Protected>;
  if (path === "/admin/billing") return <Protected><AdminBilling /></Protected>;
  if (path === "/admin/plans") return <Protected><AdminPlans /></Protected>;
  if (path === "/admin/support") return <Protected><AdminSupport /></Protected>;

  return <Landing />;
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </RouterProvider>
  );
}
