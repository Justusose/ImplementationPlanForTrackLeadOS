// Owner Settings: Profile & KYC, Integrations, Team invites, Billing.
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../lib/icons";
import { useAuth } from "../../lib/auth";
import { paystackInit, select, serverCall, update } from "../../lib/supabase";
import { Badge, Button, Card, Field, Input, PageHeader, cx } from "../../components/ui";
import { useTable } from "../../lib/useData";

const PLANS = [
  { id: "starter", name: "Starter", price: 5500 },
  { id: "growth", name: "Growth", price: 15500 },
  { id: "pro", name: "Pro", price: 35000 },
];

export default function Settings() {
  // Switch to Integrations tab automatically when returning from OAuth redirect.
  const initialTab = (() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("code") || params.get("tab") === "integrations") return "integrations";
    }
    return "profile";
  })();
  const [tab, setTab] = useState<"profile" | "integrations" | "team" | "billing">(
    initialTab as "profile" | "integrations" | "team" | "billing",
  );
  const tabs = [
    { key: "profile" as const, label: "Profile" },
    { key: "integrations" as const, label: "Integrations" },
    { key: "team" as const, label: "Team" },
    { key: "billing" as const, label: "Billing" },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your business profile, team and billing." />

      <div className="mb-6 flex gap-6 border-b border-[var(--color-line)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cx(
              "tl-focus -mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-[var(--color-brand)] text-[var(--color-brand)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <Profile />
      ) : tab === "integrations" ? (
        <Integrations />
      ) : tab === "team" ? (
        <Team />
      ) : (
        <Billing />
      )}
    </div>
  );
}

interface Workspace {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  reg_number: string | null;
}

function Profile() {
  const { session } = useAuth();
  const [ws, setWs] = useState<Partial<Workspace>>({});
  const [fullName, setFullName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    select<Workspace>("workspaces", "select=*").then((rows) => {
      if (rows[0]) setWs(rows[0]);
    });
    if (session?.user.id) {
      select<{ full_name: string | null; phone: string | null }>(
        "profiles",
        `select=full_name,phone&id=eq.${session.user.id}`,
      ).then((rows) => {
        setFullName(rows[0]?.full_name ?? "");
        setUserPhone(rows[0]?.phone ?? "");
      });
    }
  }, [session?.user.id]);

  function set(k: keyof Workspace, v: string) {
    setWs((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    if (ws.id) {
      await update("workspaces", `id=eq.${ws.id}`, {
        name: ws.name,
        phone: ws.phone,
        address: ws.address,
        city: ws.city,
        country: ws.country,
        industry: ws.industry,
        reg_number: ws.reg_number,
      });
    }
    if (session?.user.id) {
      await update("profiles", `id=eq.${session.user.id}`, {
        full_name: fullName,
        phone: userPhone,
      });
    }
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-base">Business profile</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Used across your capture widgets, invoices and KYC verification.
        </p>
        <div className="mt-5 space-y-4">
          <Field label="Workspace / business name">
            <Input value={ws.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Business phone">
              <Input value={ws.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+234…" />
            </Field>
            <Field label="Industry">
              <Input value={ws.industry ?? ""} onChange={(e) => set("industry", e.target.value)} placeholder="Retail" />
            </Field>
          </div>
          <Field label="Address">
            <Input value={ws.address ?? ""} onChange={(e) => set("address", e.target.value)} placeholder="12 Marina Rd" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <Input value={ws.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="Lagos" />
            </Field>
            <Field label="Country">
              <Input value={ws.country ?? ""} onChange={(e) => set("country", e.target.value)} placeholder="Nigeria" />
            </Field>
          </div>
          <Field label="Business reg. number (RC / CAC)" hint="Required for KYC verification.">
            <Input value={ws.reg_number ?? ""} onChange={(e) => set("reg_number", e.target.value)} placeholder="RC 1234567" />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base">Your details</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          How you appear to your team and in notifications.
        </p>
        <div className="mt-5 space-y-4">
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Okafor" />
          </Field>
          <Field label="Email">
            <Input value={session?.user.email ?? ""} disabled />
          </Field>
          <Field label="Personal phone">
            <Input value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="+234…" />
          </Field>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface Connection {
  account_id?: string;
  username?: string;
  avatar_url?: string;
  platform?: string;
  connected_at?: string;
}

const PLATFORMS = [
  {
    id: "instagram",
    label: "Instagram",
    description: "Comments, DMs & mentions from your Instagram Business account.",
    color: "#E1306C",
    icon: Icon.Meta,
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Page comments, reviews and Messenger conversations.",
    color: "#1877F2",
    icon: Icon.Meta,
  },
  {
    id: "tiktok",
    label: "TikTok",
    description: "Video comments and creator inbox from your TikTok Business.",
    color: "#010101",
    icon: Icon.Tiktok,
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    description: "Mentions, replies and DMs from your X profile.",
    color: "#14171A",
    icon: Icon.Twitter,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Post comments and company page messages.",
    color: "#0A66C2",
    icon: Icon.Linkedin,
  },
] as const;

function Integrations() {
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const exchanged = useRef(false);

  async function loadConnections() {
    const { data } = await serverCall<{ connections: Record<string, Connection> }>(
      "/social/connections",
      {},
    );
    setConnections(data?.connections ?? {});
    setLoading(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const status = params.get("status");
    const accountId = params.get("account_id");

    if ((code || status) && !exchanged.current) {
      exchanged.current = true;
      const platform = sessionStorage.getItem("sapi_connecting") ?? "";
      sessionStorage.removeItem("sapi_connecting");
      // Clean URL so a page refresh doesn't re-trigger the exchange.
      window.history.replaceState({}, "", "/app/settings?tab=integrations");

      serverCall<{ ok?: boolean; platform?: string }>("/social/exchange", {
        code: code ?? "",
        state: state ?? "",
        status: status ?? "",
        account_id: accountId ?? "",
        connection_id: params.get("connection_id") ?? "",
        platform: params.get("platform") ?? platform,
      }).then(({ data, error }) => {
        if (error) {
          setMsg({ ok: false, text: error });
        } else {
          const name = data?.platform
            ? data.platform.charAt(0).toUpperCase() + data.platform.slice(1)
            : "Account";
          setMsg({ ok: true, text: `${name} connected successfully!` });
        }
        loadConnections();
      });
    } else {
      loadConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect(platform: string) {
    setBusy(platform);
    setMsg(null);
    const { data, error } = await serverCall<{
      auth_url?: string;
      connected?: boolean;
    }>("/social/connect", { platform });
    if (error) {
      setMsg({ ok: false, text: error });
      setBusy(null);
      return;
    }
    if (data?.connected) {
      setMsg({ ok: true, text: `${platform} connected successfully!` });
      await loadConnections();
      setBusy(null);
      return;
    }
    if (data?.auth_url) {
      sessionStorage.setItem("sapi_connecting", platform);
      window.location.href = data.auth_url;
      return;
    }
    setBusy(null);
  }

  async function disconnect(platform: string) {
    setBusy(platform);
    setMsg(null);
    const { error } = await serverCall<{ ok?: boolean }>("/social/disconnect", { platform });
    if (error) {
      setMsg({ ok: false, text: error });
    } else {
      setConnections((prev) => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });
      setMsg({ ok: true, text: `${platform} disconnected.` });
    }
    setBusy(null);
  }

  async function sync() {
    setBusy("sync");
    setMsg(null);
    const { data, error } = await serverCall<{ ok?: boolean; synced?: number }>(
      "/social/sync",
      {},
    );
    setBusy(null);
    if (error) {
      setMsg({ ok: false, text: error });
    } else {
      const n = data?.synced ?? 0;
      setMsg({
        ok: true,
        text: n
          ? `Pulled ${n} new engagement${n === 1 ? "" : "s"} into your Social Radar.`
          : "You're up to date — no new engagements found.",
      });
    }
  }

  const connectedCount = Object.keys(connections).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-ink)]">Social Connections</h3>
          <p className="mt-1 max-w-lg text-sm text-[var(--color-muted)]">
            Connect your social accounts to automatically capture comments, DMs and mentions as warm
            leads in your{" "}
            <a href="/app/radar" className="text-[var(--color-brand)] hover:underline">
              Social Radar
            </a>
            .
          </p>
        </div>
        {connectedCount > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy === "sync"}
            onClick={sync}
          >
            <Icon.Radar size={15} />
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </Button>
        ) : null}
      </div>

      {/* Feedback banner */}
      {msg ? (
        <div
          className={cx(
            "rounded-xl px-4 py-3 text-sm font-medium",
            msg.ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700",
          )}
        >
          {msg.text}
        </div>
      ) : null}

      {/* Platform cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORMS.map((p) => {
          const conn = connections[p.id];
          const isConnected = !!conn;
          const isBusy = busy === p.id;
          const PlatformIcon = p.icon;
          return (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: isConnected ? `${p.color}18` : "var(--color-line-soft)",
                    color: isConnected ? p.color : "var(--color-faint)",
                  }}
                >
                  <PlatformIcon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-ink)]">{p.label}</span>
                    {isConnected ? <Badge tone="success">Connected</Badge> : null}
                  </div>
                  {conn?.username ? (
                    <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
                      @{conn.username}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted)]">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                {loading ? (
                  <div className="h-8 w-full animate-pulse rounded-lg bg-[var(--color-line-soft)]" />
                ) : isConnected ? (
                  <button
                    className="tl-focus w-full rounded-lg border border-[var(--color-line)] py-1.5 text-xs font-medium text-[var(--color-danger)] transition-colors hover:border-red-200 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => disconnect(p.id)}
                  >
                    {isBusy ? "Disconnecting…" : "Disconnect"}
                  </button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={isBusy}
                    onClick={() => connect(p.id)}
                  >
                    {isBusy ? "Connecting…" : "Connect"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer note */}
      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand)]">
          <Icon.Spark size={18} />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-ink)]">Powered by socialAPI.ai</p>
          <p className="text-xs text-[var(--color-muted)]">
            No developer app setup required — we handle the OAuth approvals for Meta, TikTok,
            YouTube, X and LinkedIn. New engagements appear in your Social Radar within minutes.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Team() {
  const { rows, refetch } = useTable<{ id: string; email: string; role: string; status: string }>(
    "workspace_members",
    "select=*",
  );
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function invite() {
    if (!email) return;
    setBusy(true);
    setMsg(null);
    const { error } = await serverCall("/team/invite", { email });
    setBusy(false);
    if (error) setMsg({ ok: false, text: error });
    else {
      setMsg({ ok: true, text: `Invite sent to ${email}.` });
      setEmail("");
      refetch();
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-1">
        <h3 className="text-base">Invite a sales rep</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          They'll get an email with a setup link to set their password and phone number.
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Email address">
            <Input
              type="email"
              placeholder="rep@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button className="w-full" disabled={!email || busy} onClick={invite}>
            <Icon.Plus size={16} /> {busy ? "Sending…" : "Send invite"}
          </Button>
          {msg ? (
            <p
              className={cx(
                "rounded-lg px-3 py-2 text-sm",
                msg.ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700",
              )}
            >
              {msg.text}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 lg:col-span-2">
        <h3 className="text-base">Team members</h3>
        {rows.length === 0 ? (
          <p className="mt-6 text-center text-sm text-[var(--color-faint)]">
            No team members yet. Invite your first sales rep to help answer chats.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-line)]">
            {rows.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--color-ink)]">{m.email}</span>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{m.role}</Badge>
                  <Badge tone={m.status === "active" ? "success" : "warning"}>{m.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Billing() {
  const { rows } = useTable<{ id: string; plan: string; billing_status: string }>(
    "workspaces",
    "select=plan,billing_status",
  );
  const ws = rows[0];
  const current = PLANS.find((p) => p.id === ws?.plan);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function checkout(planId: string) {
    setErr(null);
    setBusy(planId);
    const { url, error } = await paystackInit(planId);
    setBusy(null);
    if (error) return setErr(error);
    if (url) window.location.href = url;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base">Current plan</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Manage your subscription, billed monthly in Naira.
          </p>
        </div>
        <Badge tone={ws?.billing_status === "active" ? "success" : "brand"}>
          {current ? `${current.name} · ₦${current.price.toLocaleString()}/mo` : "No plan"}
          {ws?.billing_status ? ` · ${ws.billing_status}` : ""}
        </Badge>
      </div>

      {err ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{err}</p>
      ) : null}

      {choosing ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={cx(
                "rounded-xl border p-4",
                p.id === ws?.plan
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-50)]"
                  : "border-[var(--color-line)]",
              )}
            >
              <div className="text-sm font-semibold text-[var(--color-ink)]">{p.name}</div>
              <div className="tl-mono mt-1 text-lg font-bold">₦{p.price.toLocaleString()}</div>
              <Button
                size="sm"
                className="mt-3 w-full"
                disabled={busy === p.id}
                onClick={() => checkout(p.id)}
              >
                {busy === p.id ? "Redirecting…" : "Choose"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setChoosing(true)}>
            Change plan
          </Button>
          <Button
            variant="ghost"
            disabled={busy !== null}
            onClick={() => checkout(ws?.plan ?? "starter")}
          >
            Update payment method
          </Button>
        </div>
      )}
      <p className="mt-4 text-xs text-[var(--color-faint)]">
        Payments are securely processed via Paystack.
      </p>
    </Card>
  );
}
