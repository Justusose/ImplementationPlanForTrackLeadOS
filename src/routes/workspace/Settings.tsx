// Owner Settings: Integrations, Team invites, Billing.
import { useEffect, useState } from "react";
import { Icon, type IconName } from "../../lib/icons";
import { paystackInit, select, serverCall } from "../../lib/supabase";
import { Badge, Button, Card, Field, Input, PageHeader, cx } from "../../components/ui";
import { useTable } from "../../lib/useData";

const INTEGRATIONS: { key: string; label: string; desc: string; icon: IconName; primary?: boolean }[] = [
  { key: "meta", label: "Meta (Facebook & Instagram)", desc: "Capture comments, DMs & mentions.", icon: "Meta", primary: true },
  { key: "tiktok", label: "TikTok", desc: "Track engagements on your videos.", icon: "Tiktok" },
  { key: "x", label: "X (Twitter)", desc: "Monitor mentions and replies.", icon: "Twitter" },
  { key: "linkedin", label: "LinkedIn", desc: "Capture inbound from your page.", icon: "Linkedin" },
];

const PLANS = [
  { id: "starter", name: "Starter", price: 5500 },
  { id: "growth", name: "Growth", price: 15500 },
  { id: "pro", name: "Pro", price: 35000 },
];

export default function Settings() {
  const [tab, setTab] = useState<"integrations" | "team" | "billing">("integrations");
  const tabs = [
    { key: "integrations" as const, label: "Integrations" },
    { key: "team" as const, label: "Team" },
    { key: "billing" as const, label: "Billing" },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Connect channels, manage your team and billing." />

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

      {tab === "integrations" ? <Integrations /> : tab === "team" ? <Team /> : <Billing />}
    </div>
  );
}

function Integrations() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    select<{ provider: string }>("integrations", "select=provider").then((rows) => {
      const m: Record<string, boolean> = {};
      for (const r of rows) m[r.provider] = true;
      setConnected(m);
    });
  }, []);

  async function connect(key: string) {
    setErr(null);
    setBusy(key);
    const { data, error } = await serverCall<{ authorize_url: string }>(`/oauth/${key}/start`);
    setBusy(null);
    if (error) return setErr(error);
    if (data?.authorize_url) window.location.href = data.authorize_url;
  }

  return (
    <div>
      {err ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{err}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((it) => {
          const Ico = Icon[it.icon];
          const isOn = connected[it.key];
          return (
            <Card key={it.key} className="flex items-start justify-between gap-4 p-5">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand)]">
                  <Ico size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-ink)]">{it.label}</span>
                    {it.primary ? <Badge tone="brand">Recommended</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">{it.desc}</p>
                </div>
              </div>
              {isOn ? (
                <Badge tone="success">
                  <Icon.Check size={13} /> Connected
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === it.key}
                  onClick={() => connect(it.key)}
                >
                  {busy === it.key ? "Opening…" : "Connect"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
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
