// The Command Center: real-time ROI, active leads, cost-per-lead analytics.
import { Icon } from "../../lib/icons";
import { useTable } from "../../lib/useData";
import type { Campaign, Lead } from "../../lib/types";
import { Card, EmptyState, PageHeader, StatCard } from "../../components/ui";

function naira(n: number) {
  return "₦" + Math.round(n).toLocaleString();
}

export default function Dashboard() {
  const { rows, loading } = useTable<Lead>("leads", "select=*");
  const { rows: campaigns } = useTable<Campaign>("campaigns", "select=spend");
  const total = rows.length;
  const won = rows.filter((l) => l.stage === "won").length;
  const revenue = rows.filter((l) => l.stage === "won").reduce((s, l) => s + (l.value ?? 0), 0);
  const spend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const roas = spend > 0 ? `${Math.round((revenue / spend) * 100)}%` : total ? "—" : "0%";
  const cpl = spend > 0 && total ? naira(spend / total) : total ? "—" : "₦0";

  return (
    <div>
      <PageHeader
        title="Command Center"
        subtitle="Real-time performance across your entire acquisition funnel."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Return on ad spend"
          value={roas}
          delta={null}
          icon={<Icon.Trend size={18} />}
        />
        <StatCard label="Active leads" value={String(total)} delta={null} icon={<Icon.Users size={18} />} />
        <StatCard
          label="Cost per lead"
          value={cpl}
          delta={null}
          icon={<Icon.Naira size={18} />}
        />
        <StatCard
          label="Revenue won"
          value={`₦${revenue.toLocaleString()}`}
          delta={won ? { value: `${won} deals`, positive: true } : null}
          icon={<Icon.Check size={18} />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base">Leads captured</h3>
            <span className="text-xs text-[var(--color-faint)]">Last 14 days</span>
          </div>
          {loading || total === 0 ? (
            <div className="mt-4">
              <EmptyChart />
            </div>
          ) : (
            <Sparkline values={buildSeries(rows)} />
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-base">Channels</h3>
          {total === 0 ? (
            <p className="mt-6 text-center text-sm text-[var(--color-faint)]">
              No channel data yet. Connect an integration to see where your leads come from.
            </p>
          ) : (
            <ChannelBars rows={rows} />
          )}
        </Card>
      </div>

      {total === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Icon.Dashboard size={26} />}
            title="Your analytics will appear here"
            body="Once leads start flowing in from your ads, website and Social Radar, this dashboard lights up with live ROI."
          />
        </div>
      ) : null}
    </div>
  );
}

function buildSeries(rows: Lead[]): number[] {
  const days = Array(14).fill(0);
  const now = Date.now();
  for (const l of rows) {
    const d = Math.floor((now - new Date(l.created_at).getTime()) / 8.64e7);
    if (d >= 0 && d < 14) days[13 - d] += 1;
  }
  return days;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 560;
  const h = 160;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - (v / max) * (h - 20) - 10]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tl-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#tl-grad)" />
      <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ChannelBars({ rows }: { rows: Lead[] }) {
  const counts: Record<string, number> = {};
  for (const l of rows) counts[l.source ?? "Direct"] = (counts[l.source ?? "Direct"] ?? 0) + 1;
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="mt-4 space-y-3">
      {Object.entries(counts).map(([k, v]) => (
        <div key={k}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-[var(--color-ink-soft)]">{k}</span>
            <span className="tl-mono text-[var(--color-muted)]">{v}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-line-soft)]">
            <div
              className="h-2 rounded-full bg-[var(--color-brand)]"
              style={{ width: `${(v / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-end gap-1.5">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-[var(--color-line-soft)]"
          style={{ height: `${20 + ((i * 37) % 60)}%` }}
        />
      ))}
    </div>
  );
}
