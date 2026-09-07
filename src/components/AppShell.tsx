// Authenticated app shell: role-aware sidebar + topbar. Responsive with mobile drawer.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../lib/icons";
import { Link, useRouter } from "../lib/router";
import { useAuth } from "../lib/auth";
import { select, supabaseConfigured } from "../lib/supabase";
import { Badge, Button, cx } from "./ui";

interface NavItem {
  label: string;
  to: string;
  icon: IconName;
}

const NAV: Record<string, NavItem[]> = {
  owner: [
    { label: "Command Center", to: "/app", icon: "Dashboard" },
    { label: "Pipeline", to: "/app/pipeline", icon: "Pipeline" },
    { label: "Radar", to: "/app/radar", icon: "Radar" },
    { label: "Campaigns", to: "/app/campaigns", icon: "Link" },
    { label: "Capture Widgets", to: "/app/widgets", icon: "Widget" },
    { label: "Settings", to: "/app/settings", icon: "Settings" },
  ],
  staff: [
    { label: "Pipeline", to: "/staff", icon: "Pipeline" },
    { label: "Radar", to: "/staff/radar", icon: "Radar" },
  ],
  super_admin: [
    { label: "Master Dashboard", to: "/admin", icon: "Dashboard" },
    { label: "Tenants", to: "/admin/tenants", icon: "Building" },
    { label: "Users", to: "/admin/users", icon: "Users" },
    { label: "Billing", to: "/admin/billing", icon: "Card" },
    { label: "Plans & Features", to: "/admin/plans", icon: "Layers" },
    { label: "Support Inbox", to: "/admin/support", icon: "Inbox" },
  ],
};

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white">
        <Icon.Radar size={18} />
      </div>
      {!compact ? (
        <span className="font-display text-[17px] font-bold tracking-tight text-[var(--color-ink)]">
          TrackLead<span className="text-[var(--color-brand)]"> OS</span>
        </span>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, session, signOut } = useAuth();
  const { path } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV[role ?? "owner"] ?? [];

  const roleLabel =
    role === "super_admin" ? "Kalimb Admin" : role === "staff" ? "Sales Rep" : "Workspace Owner";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to={role === "super_admin" ? "/admin" : role === "staff" ? "/staff" : "/app"}>
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {items.map((item) => {
          const active = path === item.to || (item.to !== "/app" && item.to !== "/staff" && item.to !== "/admin" && path.startsWith(item.to));
          const Ico = Icon[item.icon];
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cx(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]",
              )}
            >
              <Ico size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--color-line)] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-sm font-semibold text-white">
            {(session?.name ?? session?.user.email ?? "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-[var(--color-ink)]">
              {session?.name ?? "You"}
            </div>
            <div className="truncate text-xs text-[var(--color-muted)]">{roleLabel}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
            <Icon.Logout size={17} />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-[var(--color-canvas)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-line)] bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cx(
          "fixed inset-0 z-40 lg:hidden",
          mobileOpen ? "" : "pointer-events-none",
        )}
      >
        <div
          className={cx(
            "absolute inset-0 bg-slate-900/30 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cx(
            "absolute left-0 top-0 h-full w-64 bg-white shadow-[var(--tl-shadow-lg)] transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebar}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--color-line)] bg-white/80 px-4 backdrop-blur lg:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Icon.Menu size={20} />
          </Button>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!supabaseConfigured ? (
              <Badge tone="warning">Preview mode · connect Supabase for live data</Badge>
            ) : (
              <Badge tone="success">
                <span className="tl-live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                Live
              </Badge>
            )}
            <NotificationsBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl tl-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}

interface Notice {
  id: string;
  title: string;
  detail: string;
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    Promise.all([
      select<{ id: string; name: string; source: string | null; created_at: string }>(
        "leads",
        "select=id,name,source,created_at&order=created_at.desc&limit=5",
      ),
      select<{ id: string; author: string; platform: string }>(
        "social_events",
        "select=id,author,platform&order=created_at.desc&limit=5",
      ),
    ]).then(([leads, social]) => {
      const n: Notice[] = [
        ...leads.map((l) => ({
          id: `l-${l.id}`,
          title: `New lead: ${l.name}`,
          detail: l.source ?? "direct",
        })),
        ...social.map((s) => ({
          id: `s-${s.id}`,
          title: `${s.author} engaged on ${s.platform}`,
          detail: "Convert from the Radar",
        })),
      ];
      setItems(n.slice(0, 8));
    });
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="sm" aria-label="Notifications" onClick={() => setOpen((o) => !o)}>
        <span className="relative">
          <Icon.Bell size={18} />
          {items.length ? (
            <span className="absolute -right-1 -top-1 flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />
          ) : null}
        </span>
      </Button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--tl-shadow-lg)]">
          <div className="border-b border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)]">
            Notifications
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-faint)]">
              You're all caught up.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-[var(--color-line)] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <div className="text-sm font-medium text-[var(--color-ink)]">{n.title}</div>
                  <div className="text-xs text-[var(--color-muted)]">{n.detail}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
