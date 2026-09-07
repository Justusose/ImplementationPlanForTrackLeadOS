// Capture Widgets: UI builder for vCards and embedded web forms.
import { useState } from "react";
import { Icon } from "../../lib/icons";
import { insert } from "../../lib/supabase";
import { Button, Card, Field, Input, PageHeader, cx } from "../../components/ui";

interface Widget {
  id: string;
}

export default function Widgets() {
  const [tab, setTab] = useState<"vcard" | "form">("vcard");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const w = await insert<Widget>("capture_widgets", {
      kind: tab,
      config: { name: name.trim(), phone: phone.trim() },
    });
    setBusy(false);
    if (w) setShareId(w.id);
  }

  const shareUrl = shareId ? `${window.location.origin}/w/${shareId}` : "";

  return (
    <div>
      <PageHeader
        title="Capture Widgets"
        subtitle="Build vCards and embeddable web forms that funnel straight into your pipeline."
      />

      <div className="mb-5 inline-flex rounded-xl border border-[var(--color-line)] bg-white p-1">
        {(["vcard", "form"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "tl-focus rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-[var(--color-brand)] text-white"
                : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]",
            )}
          >
            {t === "vcard" ? "vCard" : "Web form"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-base">{tab === "vcard" ? "Digital business card" : "Embedded lead form"}</h3>
          <div className="mt-5 space-y-4">
            <Field label={tab === "vcard" ? "Display name" : "Form title"}>
              <Input placeholder="Ada's Fabrics" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="WhatsApp number" hint="Leads tap once to start a chat.">
              <Input placeholder="+234 801 234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Button className="w-full" onClick={create} disabled={busy || !name.trim()}>
              <Icon.Widget size={16} />{" "}
              {busy ? "Creating…" : tab === "vcard" ? "Create vCard" : "Create form"}
            </Button>
            {shareUrl ? (
              <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-3">
                <p className="text-xs font-medium text-[var(--color-ink-soft)]">Shareable link</p>
                <div className="mt-1 break-all text-xs tl-mono text-[var(--color-brand-700)]">
                  {shareUrl}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => navigator.clipboard?.writeText(shareUrl)}
                >
                  <Icon.Copy size={14} /> Copy link
                </Button>
              </div>
            ) : null}
          </div>
        </Card>

        {/* Live preview */}
        <Card className="flex items-center justify-center bg-[var(--color-canvas)] p-6">
          {tab === "vcard" ? (
            <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-[var(--tl-shadow-lg)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand)] text-2xl font-bold text-white">
                {(name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="mt-3 text-lg font-semibold text-[var(--color-ink)]">
                {name || "Your business"}
              </div>
              <div className="text-sm text-[var(--color-muted)]">{phone || "+234 000 000 0000"}</div>
              <Button variant="wa" className="mt-4 w-full">
                <Icon.Whatsapp size={18} /> Message on WhatsApp
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-[var(--tl-shadow-lg)]">
              <div className="text-base font-semibold text-[var(--color-ink)]">
                {name || "Get in touch"}
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="h-9 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]" />
                <div className="h-9 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]" />
                <div className="h-9 rounded-lg bg-[var(--color-brand)]" />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
