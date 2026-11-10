import { Button, Spinner } from "@heroui/react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-default text-foreground" : "text-muted hover:text-foreground"
  }`;

export default function Layout() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!session) return <Navigate to="/app/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-4 font-display text-xl font-bold tracking-tight">Folioseen</span>
          <nav className="flex gap-1">
            <NavLink to="/app" end className={navClass}>
              Links
            </NavLink>
            <NavLink to="/app/case-studies" className={navClass}>
              Case studies
            </NavLink>
            <NavLink to="/app/settings" className={navClass}>
              Settings
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{session.user.email}</span>
            <Button size="sm" variant="ghost" onPress={() => supabase.auth.signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
