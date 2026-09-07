// Super Admin (Kalimb internal) pages: Master Dashboard, Tenants, Users,
// Billing, Plans & Features, Support Inbox.
import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import { serverCall, update } from "../../lib/supabase";
import { useTable } from "../../lib/useData";
import { Badge, Button, Card, Drawer, EmptyState, Field, Input, PageHeader, StatCard } from "../../components/ui";

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
  price_ngn: number;
  lead_limit: number | null;
}

export function AdminPlans() {
  const { rows, setRows } = useTable<Plan>(
    "subscription_plans",
    "select=id,name,price_ngn,lead_limit&order=price_ngn.asc",
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function edit(id: string, patch: Partial<Plan>) {
    setRows((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function save(p: Plan) {
    setSaving(p.id);
    setSaved(null);
    const ok = await update("subscription_plans", `id=eq.${p.id}`, {
      price_ngn: Number(p.price_ngn) || 0,
      lead_limit: p.lead_limit === null || (p.lead_limit as unknown as string) === "" ? null : Number(p.lead_limit),
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
        subtitle="Set subscription tiers, prices and limits — reflected live on the pricing page."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {rows.map((p) => (
          <Card key={p.id} className="p-6">
            <h3 className="text-base">{p.name}</h3>
            <Field label="Monthly price (₦)">
              <Input
                type="number"
                value={p.price_ngn}
                onChange={(e) => edit(p.id, { price_ngn: Number(e.target.value) })}
              />
            </Field>
            <Field label="Lead limit" hint="Leave blank for unlimited.">
              <Input
                type="number"
                placeholder="Unlimited"
                value={p.lead_limit ?? ""}
                onChange={(e) =>
                  edit(p.id, { lead_limit: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </Field>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={saving === p.id}
              onClick={() => save(p)}
            >
              {saving === p.id ? "Saving…" : saved === p.id ? "Saved ✓" : "Save changes"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
}

export function AdminSupport() {
  const { rows, setRows } = useTable<Ticket>("support_tickets", "select=*&order=created_at.desc");

  async function resolve(id: string) {
    const ok = await update("support_tickets", `id=eq.${id}`, { status: "resolved" });
    if (ok) setRows((prev) => prev.map((t) => (t.id === id ? { ...t, status: "resolved" } : t)));
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
                <span className="text-sm text-[var(--color-ink)]">{t.subject}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={t.status === "open" ? "warning" : "success"}>{t.status}</Badge>
                  {t.status === "open" ? (
                    <Button size="sm" variant="ghost" onClick={() => resolve(t.id)}>
                      Resolve
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
