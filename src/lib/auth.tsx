// Auth + RBAC context. Wraps the Supabase data layer and exposes role helpers.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  getSession,
  setSession,
  signInWithPassword,
  signUp as sbSignUp,
  supabaseConfigured,
  type Role,
  type Session,
} from "./supabase";

interface AuthCtx {
  session: Session | null;
  role: Role | null;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    meta?: Record<string, unknown>,
  ) => Promise<{ error?: string; confirmed?: boolean }>;
  /** Local role preview for navigating the product before Supabase is connected. */
  previewAs: (role: Role) => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSess] = useState<Session | null>(() => getSession());

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await signInWithPassword(email, password);
    if (res.error) return { error: res.error };
    const role: Role = res.data?.user?.app_metadata?.role ?? "owner";
    const next: Session = {
      access_token: res.data.access_token,
      refresh_token: res.data.refresh_token,
      user: { id: res.data.user.id, email: res.data.user.email },
      role,
      workspace_id: res.data.user?.app_metadata?.workspace_id ?? null,
      name: res.data.user?.user_metadata?.full_name ?? res.data.user?.user_metadata?.name,
    };
    setSession(next);
    setSess(next);
    return {};
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, meta?: Record<string, unknown>) => {
      const res = await sbSignUp(email, password, meta);
      if (res.error) return { error: res.error };
      // When email confirmation is disabled, GoTrue returns a live session on signup.
      const s = res.data;
      if (s?.access_token && s?.user) {
        const role: Role = s.user?.app_metadata?.role ?? "owner";
        const next: Session = {
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          user: { id: s.user.id, email: s.user.email },
          role,
          workspace_id: s.user?.app_metadata?.workspace_id ?? null,
          name: s.user?.user_metadata?.full_name,
        };
        setSession(next);
        setSess(next);
        return { confirmed: true };
      }
      return { confirmed: false };
    },
    [],
  );

  const previewAs = useCallback((role: Role) => {
    const next: Session = {
      access_token: "preview",
      user: { id: "preview", email: `${role}@tracklead.preview` },
      role,
      workspace_id: role === "super_admin" ? null : "preview-workspace",
      name:
        role === "super_admin" ? "Kalimb Admin" : role === "owner" ? "Business Owner" : "Sales Rep",
    };
    setSession(next);
    setSess(next);
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    setSess(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      role: session?.role ?? null,
      configured: supabaseConfigured,
      signIn,
      signUp,
      previewAs,
      signOut,
    }),
    [session, signIn, signUp, previewAs, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// --- RBAC route access map -------------------------------------------------
export const roleHome: Record<Role, string> = {
  super_admin: "/admin",
  owner: "/app",
  staff: "/staff",
};

export function canAccess(role: Role | null, path: string): boolean {
  if (!role) return false;
  if (path.startsWith("/admin")) return role === "super_admin";
  if (path.startsWith("/app")) return role === "owner";
  if (path.startsWith("/staff")) return role === "staff" || role === "owner";
  return true;
}
