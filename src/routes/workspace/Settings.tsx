// Owner Settings: Profile & KYC, Integrations, Team invites, Billing.
import { useEffect, useState } from "react";
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
  const [tab, setTab] = useState<"profile" | "integrations" | "team" | "billing">("profile");
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

function Integrations() {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-50)] text-[var(--color-brand)]">
        <Icon.Radar size={26} />
      </div>
      <h3 className="text-lg">Integrations are coming soon</h3>
      <p className="mt-1.5 max-w-md text-sm text-[var(--color-muted)]">
        Connect Meta, TikTok, X and LinkedIn to turn comments, DMs and mentions into warm leads
        automatically. We're putting the finishing touches on it.
      </p>
      <Badge tone="brand">
        <Icon.Spark size={13} /> Coming soon
      </Badge>
    </Card>
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
