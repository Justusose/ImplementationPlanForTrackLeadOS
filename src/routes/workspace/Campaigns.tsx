// Campaigns & Links: UTM smart-link generator + performance table.
import { useState } from "react";
import { Icon } from "../../lib/icons";
import { insert } from "../../lib/supabase";
import { useTable } from "../../lib/useData";
import type { Campaign } from "../../lib/types";
import { Button, Card, EmptyState, Field, Input, PageHeader } from "../../components/ui";

export default function Campaigns() {
  const { rows, refetch } = useTable<Campaign>("campaigns", "select=*");
  const [base, setBase] = useState("");
  const [source, setSource] = useState("instagram");
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);

  const generated =
    base && campaign
      ? `${base}${base.includes("?") ? "&" : "?"}utm_source=${encodeURIComponent(
          source,
        )}&utm_medium=paid&utm_campaign=${encodeURIComponent(campaign)}`
      : "";

  return (
    <div>
      <PageHeader title="Campaigns & Links" subtitle="Prove exact ROI on every Naira of ad spend." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-base">Smart Link generator</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Build a UTM-tracked link to attribute leads back to the exact ad.
          </p>
          <div className="mt-5 space-y-4">
            <Field label="Destination URL">
              <Input
                placeholder="https://yourbusiness.com/offer"
                value={base}
                onChange={(e) => setBase(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source">
                <select
                  className="tl-focus h-10 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 text-sm"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  {["instagram", "facebook", "tiktok", "x", "linkedin", "whatsapp"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Campaign name">
                <Input
                  placeholder="dec-promo"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                />
              </Field>
            </div>

            {generated ? (
              <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-3">
                <div className="break-all text-xs tl-mono text-[var(--color-brand-700)]">
                  {generated}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={async () => {
                    navigator.clipboard?.writeText(generated);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                    await insert("campaigns", {
                      name: campaign,
                      channel: source,
                      url: generated,
                    });
                    refetch();
                  }}
                >
                  <Icon.Copy size={14} /> {copied ? "Copied!" : "Copy link"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-faint)]">
                Enter a URL and campaign name to generate your link.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base">Campaign performance</h3>
          {rows.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<Icon.Link size={24} />}
                title="No campaigns tracked yet"
                body="Generate your first Smart Link and share it in an ad to start measuring attribution."
              />
            </div>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-faint)]">
                  <th className="pb-2 font-medium">Campaign</th>
                  <th className="pb-2 text-right font-medium">Clicks</th>
                  <th className="pb-2 text-right font-medium">Leads</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t border-[var(--color-line)]">
                    <td className="py-2.5 font-medium text-[var(--color-ink)]">{c.name}</td>
                    <td className="py-2.5 text-right tl-mono">{c.clicks}</td>
                    <td className="py-2.5 text-right tl-mono text-[var(--color-brand)]">{c.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
