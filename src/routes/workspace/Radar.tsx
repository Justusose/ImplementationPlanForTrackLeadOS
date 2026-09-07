// The Radar: split screen — Live Web Visitors + Social Media Engagements (Meta API).
import { useState } from "react";
import { Icon } from "../../lib/icons";
import { insert } from "../../lib/supabase";
import { useTable } from "../../lib/useData";
import type { SocialEvent } from "../../lib/types";
import { Badge, Button, Card, EmptyState, PageHeader } from "../../components/ui";

export default function Radar({ staff = false }: { staff?: boolean }) {
  const [converted, setConverted] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function convert(e: SocialEvent) {
    setBusy(e.id);
    const ok = await insert("leads", {
      name: e.author || "Social contact",
      source: e.platform,
      stage: "new",
      campaign: `${e.platform} ${e.type}`,
    });
    setBusy(null);
    if (ok) setConverted((prev) => ({ ...prev, [e.id]: true }));
  }

  const { rows: social } = useTable<SocialEvent>("social_events", "select=*&order=created_at.desc");
  const { rows: visitors } = useTable<{ id: string; page: string; city: string }>(
    "web_visitors",
    "select=*&order=created_at.desc",
  );

  return (
    <div>
      <PageHeader
        title="The Radar"
        subtitle="Live web visitors and social engagements, captured in real time."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Live web visitors */}
        <Card className="flex flex-col p-0">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Icon.Globe size={18} className="text-[var(--color-brand)]" />
              <h3 className="text-base">Live web visitors</h3>
            </div>
            <Badge tone="success">
              <span className="tl-live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
              {visitors.length} online
            </Badge>
          </div>
          <div className="flex-1 p-5">
            {visitors.length === 0 ? (
              <EmptyState
                icon={<Icon.Globe size={24} />}
                title="No live visitors yet"
                body="Install your tracking snippet from Capture Widgets to see who's on your site right now."
              />
            ) : (
              <ul className="space-y-2">
                {visitors.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-line)] px-3 py-2.5"
                  >
                    <span className="text-sm text-[var(--color-ink-soft)]">{v.page}</span>
                    <span className="text-xs text-[var(--color-faint)]">{v.city}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Social engagements */}
        <Card className="flex flex-col p-0">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Icon.Radar size={18} className="text-[var(--color-brand)]" />
              <h3 className="text-base">Social engagements</h3>
            </div>
            <Badge tone="brand">Meta · TikTok · X</Badge>
          </div>
          <div className="flex-1 p-5">
            {social.length === 0 ? (
              <EmptyState
                icon={<Icon.Radar size={24} />}
                title="No engagements captured"
                body="Connect your Meta, Instagram or TikTok accounts in Settings to turn comments and DMs into warm leads."
              />
            ) : (
              <ul className="space-y-2">
                {social.map((e) => (
                  <li key={e.id} className="rounded-xl border border-[var(--color-line)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-ink)]">{e.author}</span>
                      <Badge tone="neutral">{e.platform}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{e.text}</p>
                    {converted[e.id] ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-success)]">
                        <Icon.Check size={14} /> Added to pipeline
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        disabled={busy === e.id}
                        onClick={() => convert(e)}
                      >
                        <Icon.Plus size={14} /> {busy === e.id ? "Converting…" : "Convert to Lead"}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
      {staff ? (
        <p className="mt-4 text-xs text-[var(--color-faint)]">
          Monitor incoming comments and DMs, then convert the promising ones into leads.
        </p>
      ) : null}
    </div>
  );
}
