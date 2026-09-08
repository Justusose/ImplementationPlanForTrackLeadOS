// Super Admin (Kalimb internal) pages: Master Dashboard, Tenants, Users,
// Billing, Plans & Features, Support Inbox.
import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import { serverCall, update } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useTable } from "../../lib/useData";
import { Badge, Button, Card, Drawer, EmptyState, Field, Input, PageHeader, StatCard, Textarea } from "../../components/ui";
import { Thread, type Ticket } from "../workspace/Support";

const PLAN_PRICES: Record<string, number> = { starter: 5500, growth: 15500, pro: 35000 };

export function AdminDashboard() {
  const { rows } = useTable<{ id: string; billing_status: string; plan: string }>(
    "workspaces",
    "select=id,billing_status,plan",
  );
  const active = rows.filter((w) => w.billing_status === "active").length;
  const mrr = rows
    .filter((w) => w.billing_status === "active")
    .reduce((s, w) => s + (PLAN_PRICES[w.plan] ?? 0), 0);
  const churned = rows.filter((w) => w.billing_status === "suspended").length;
  const churn = rows.length ? `${Math.round((churned / rows.length) * 100)}%` : "0%";

  return (
    <div>
      <PageHeader title="Master Dashboard" subtitle="System health across the entire TrackLead platform." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Global MRR" value={`₦${mrr.toLocaleString()}`} delta={null} icon={<Icon.Naira size={18} />} />
        <StatCard label="Active workspaces" value={String(active)} delta={null} icon={<Icon.Building size={18} />} />
        <StatCard label="Churn rate" value={churn} delta={null} icon={<Icon.Trend size={18} />} />
      </div>
      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Icon.Dashboard size={26} />}
            title="No workspaces onboarded yet"
            body="Once businesses sign up, global revenue, growth and churn analytics appear here in real time."
          />
        </div>
      ) : null}
    </div>
  );
}

interface Tenant {
  id: string;
  name: string;
  billing_status: string;
  plan: string;
}

export function AdminTenants() {
  const { rows, setRows } = useTable<Tenant>("workspaces", "select=*");
  const [managing, setManaging] = useState<Tenant | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(id: string, patch: Partial<Tenant>) {
    setBusy(true);
    const { error } = await serverCall(`/admin/tenant/${id}`, patch);
    setBusy(false);
    if (!error) {
      setRows((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      setManaging((m) => (m ? { ...m, ...patch } : m));
    }
  }

  return (
    <div>
      <PageHeader title="Tenants" subtitle="Every business registered on TrackLead OS." />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Icon.Building size={26} />}
          title="No tenants yet"
          body="Registered businesses will appear here. You can click in to suspend accounts or change their plan."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-canvas)] text-left text-xs text-[var(--color-faint)]">
              <tr>
                <th className="px-5 py-3 font-medium">Business</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-[var(--color-line)]">
                  <td className="px-5 py-3 font-medium text-[var(--color-ink)]">{t.name}</td>
                  <td className="px-5 py-3 capitalize">{t.plan}</td>
                  <td className="px-5 py-3">
                    <Badge tone={t.billing_status === "suspended" ? "danger" : "success"}>
                      {t.billing_status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setManaging(t)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Drawer
        open={!!managing}
        onClose={() => setManaging(null)}
        title={
          managing ? (
            <div className="text-base font-semibold text-[var(--color-ink)]">{managing.name}</div>
          ) : null
        }
      >
        {managing ? (
          <div className="space-y-6">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Plan</h4>
              <div className="flex gap-2">
                {Object.keys(PLAN_PRICES).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={managing.plan === p ? "primary" : "secondary"}
                    disabled={busy}
                    onClick={() => save(managing.id, { plan: p })}
                  >
                    <span className="capitalize">{p}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Account status</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => save(managing.id, { billing_status: "active" })}
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => save(managing.id, { billing_status: "suspended" })}
                >
                  Suspend
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

export function AdminUsers() {
  const { rows } = useTable<{ id: string; email: string; role: string }>("profiles", "select=*");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function loginAs(email: string) {
    setBusy(email);
    setMsg(null);
    const { data, error } = await serverCall<{ action_link: string }>("/admin/impersonate", { email });
    setBusy(null);
    if (error) return setMsg(error);
    if (data?.action_link) window.open(data.action_link, "_blank");
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="All owners and staff across every workspace." />
      {msg ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{msg}</p>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          icon={<Icon.Users size={26} />}
          title="No users yet"
          body="Every owner and staff member will be listed here. You can log in as them to troubleshoot."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-[var(--color-line)]">
            {rows.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-[var(--color-ink)]">{u.email}</span>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{u.role}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === u.email}
                    onClick={() => loginAs(u.email)}
                  >
                    {busy === u.email ? "Generating…" : "Login as"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function AdminBilling() {
  const { rows } = useTable<{ id: string; provider: string; status: string; amount: number }>(
    "billing_events",
    "select=*&order=created_at.desc",
  );
  return (
    <div>
      <PageHeader title="Billing Management" subtitle="Webhook logs and failed-payment alerts." />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Icon.Card size={26} />}
          title="No billing events yet"
          body="Paystack webhook events — successful charges and failed payments — will stream in here."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-[var(--color-line)]">
            {rows.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm capitalize">{b.provider}</span>
                <span className="tl-mono text-sm">₦{b.amount?.toLocaleString()}</span>
                <Badge tone={b.status === "success" ? "success" : "danger"}>{b.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

interface Plan {
  id: string;
  name: string;
  tagline: string | null;
  price_ngn: number;
  lead_limit: number | null;
  seat_limit: number | null;
  features: string[];
  highlighted: boolean;
}

export function AdminPlans() {
  const { rows, setRows } = useTable<Plan>(
    "subscription_plans",
    "select=id,name,tagline,price_ngn,lead_limit,seat_limit,features,highlighted&order=price_ngn.asc",
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function edit(id: string, patch: Partial<Plan>) {
    setRows((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function save(p: Plan) {
    setSaving(p.id);
    setSaved(null);
    const num = (v: number | null) =>
      v === null || (v as unknown as string) === "" ? null : Number(v);
    const ok = await update("subscription_plans", `id=eq.${p.id}`, {
      name: p.name,
      tagline: p.tagline,
      price_ngn: Number(p.price_ngn) || 0,
      lead_limit: num(p.lead_limit),
      seat_limit: num(p.seat_limit),
      features: (p.features ?? []).filter((f) => f.trim() !== ""),
      highlighted: p.highlighted,
    });
    setSaving(null);
    if (ok) {
      setSaved(p.id);
      setTimeout(() => setSaved(null), 1500);
    }
  }

  return (
    <div>
      <PageHeader
        title="Plans & Features"
        subtitle="Set subscription tiers, prices, limits and features — reflected live on the pricing page and enforced across every workspace."
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Icon.Layers size={26} />}
          title="No plans configured"
          body="Seed your subscription_plans table (Starter, Growth, Pro) to manage pricing and limits here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {rows.map((p) => (
            <Card
              key={p.id}
              className={cxHighlight(p.highlighted)}
            >
              <Field label="Plan name">
                <Input value={p.name} onChange={(e) => edit(p.id, { name: e.target.value })} />
              </Field>
              <Field label="Tagline">
                <Input
                  value={p.tagline ?? ""}
                  placeholder="For growing teams"
                  onChange={(e) => edit(p.id, { tagline: e.target.value })}
                />
              </Field>
              <Field label="Monthly price (₦)">
                <Input
                  type="number"
                  value={p.price_ngn}
                  onChange={(e) => edit(p.id, { price_ngn: Number(e.target.value) })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Lead limit" hint="Blank = unlimited">
                  <Input
                    type="number"
                    placeholder="∞"
                    value={p.lead_limit ?? ""}
                    onChange={(e) =>
                      edit(p.id, { lead_limit: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Seat limit" hint="Blank = unlimited">
                  <Input
                    type="number"
                    placeholder="∞"
                    value={p.seat_limit ?? ""}
                    onChange={(e) =>
                      edit(p.id, { seat_limit: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <Field label="Features" hint="One per line — shown on the pricing page.">
                <Textarea
                  rows={5}
                  value={(p.features ?? []).join("\n")}
                  onChange={(e) => edit(p.id, { features: e.target.value.split("\n") })}
                  placeholder={"Unlimited pipelines\nSocial Radar\nPriority support"}
                />
              </Field>
              <label className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
                <input
                  type="checkbox"
                  checked={p.highlighted}
                  onChange={(e) => edit(p.id, { highlighted: e.target.checked })}
                />
                Highlight as "most popular"
              </label>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                disabled={saving === p.id}
                onClick={() => save(p)}
              >
                {saving === p.id ? "Saving…" : saved === p.id ? "Saved ✓" : "Save changes"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function cxHighlight(on: boolean) {
  return on ? "space-y-1 border-2 border-[var(--color-brand)] p-6" : "space-y-1 p-6";
}

export function AdminSupport() {
  const { session } = useAuth();
  const { rows, setRows } = useTable<Ticket>("support_tickets", "select=*&order=created_at.desc");
  const [active, setActive] = useState<Ticket | null>(null);

  async function setStatus(id: string, status: string) {
    const ok = await update("support_tickets", `id=eq.${id}`, { status });
    if (ok) {
      setRows((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      setActive((a) => (a && a.id === id ? { ...a, status } : a));
    }
  }

  return (
    <div>
      <PageHeader title="Support Inbox" subtitle="Queries and support requests from your customers." />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Icon.Inbox size={26} />}
          title="Inbox zero"
          body="Support requests submitted by workspace owners and staff will appear here for you to respond to."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-[var(--color-line)]">
            {rows.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <button
                  className="tl-focus flex-1 text-left text-sm text-[var(--color-ink)] hover:text-[var(--color-brand)]"
                  onClick={() => setActive(t)}
                >
                  {t.subject}
                </button>
                <div className="flex items-center gap-2">
                  <Badge tone={t.status === "open" ? "warning" : "success"}>{t.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setActive(t)}>
                    Open
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={
          active ? (
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-[var(--color-ink)]">{active.subject}</span>
              <Badge tone={active.status === "open" ? "warning" : "success"}>{active.status}</Badge>
            </div>
          ) : null
        }
      >
        {active ? (
          <div className="space-y-4">
            <Thread ticket={active} senderRole="super_admin" senderId={session?.user.id ?? null} />
            <div className="flex gap-2">
              {active.status === "open" ? (
                <Button size="sm" variant="secondary" onClick={() => setStatus(active.id, "resolved")}>
                  Mark resolved
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setStatus(active.id, "open")}>
                  Reopen
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
