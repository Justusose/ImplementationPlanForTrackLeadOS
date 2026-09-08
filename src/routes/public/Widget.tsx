// Public capture widget: the shareable vCard / lead form a business sends to
// customers. Reads a single widget by id (anon-readable) and renders it.
import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import { select, serverCall } from "../../lib/supabase";
import { Button, Card } from "../../components/ui";

interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea";
  required: boolean;
  placeholder?: string;
}

interface WidgetRow {
  id: string;
  kind: string;
  workspace_id: string;
  config: {
    name?: string;
    subtitle?: string;
    phone?: string;
    fields?: FormField[];
    layout?: "card" | "minimal" | "split";
    accent?: string;
    submitLabel?: string;
  };
}

const DEFAULT_FIELDS: FormField[] = [
  { id: "d1", label: "Full name", type: "text", required: true, placeholder: "Your name" },
  { id: "d2", label: "Phone", type: "tel", required: true, placeholder: "+234…" },
];

export default function PublicWidget({ id }: { id: string }) {
  const [w, setW] = useState<WidgetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    select<WidgetRow>("capture_widgets", `select=*&id=eq.${id}`).then((rows) => {
      setW(rows[0] ?? null);
      setLoading(false);
    });
  }, [id]);

  const fields = w?.config.fields?.length ? w.config.fields : DEFAULT_FIELDS;
  const accent = w?.config.accent ?? "var(--color-brand)";
  const missingRequired = fields.some((f) => f.required && !(values[f.label] ?? "").trim());

  function keyFor(label: string): "name" | "phone" | "email" | null {
    const l = label.toLowerCase();
    if (l.includes("name")) return "name";
    if (l.includes("phone") || l.includes("whatsapp") || l.includes("number")) return "phone";
    if (l.includes("email")) return "email";
    return null;
  }

  async function submit() {
    if (!w || missingRequired) return;
    setBusy(true);
    const payload: Record<string, string> = {};
    for (const f of fields) {
      const v = (values[f.label] ?? "").trim();
      const mapped = keyFor(f.label);
      if (mapped) payload[mapped] = v;
    }
    await serverCall(`/capture/${w.id}`, { ...payload, fields: values });
    setBusy(false);
    setSent(true);
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--color-canvas)] px-5 py-12">
      {loading ? (
        <p className="text-sm text-[var(--color-faint)]">Loading…</p>
      ) : !w ? (
        <Card className="p-8 text-center">
          <h3 className="text-base">Link not found</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">This capture link is no longer active.</p>
        </Card>
      ) : w.kind === "vcard" ? (
        <div className="w-full max-w-xs rounded-2xl bg-white p-8 text-center shadow-[var(--tl-shadow-lg)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand)] text-2xl font-bold text-white">
            {(w.config.name || "A").charAt(0).toUpperCase()}
          </div>
          <div className="mt-3 text-lg font-semibold text-[var(--color-ink)]">
            {w.config.name || "Business"}
          </div>
          <div className="text-sm text-[var(--color-muted)]">{w.config.phone}</div>
          <a
            href={w.config.phone ? `https://wa.me/${w.config.phone.replace(/\D/g, "")}` : "#"}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="wa" className="mt-4 w-full">
              <Icon.Whatsapp size={18} /> Message on WhatsApp
            </Button>
          </a>
        </div>
      ) : (
        <div
          className={
            w.config.layout === "minimal"
              ? "w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white"
              : "w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[var(--tl-shadow-lg)]"
          }
        >
          {sent ? (
            <div className="p-8 text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                style={{ backgroundColor: accent }}
              >
                <Icon.Check size={22} />
              </div>
              <h3 className="mt-3 text-base font-semibold text-[var(--color-ink)]">Thank you!</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">We'll be in touch shortly.</p>
            </div>
          ) : (
            <>
              {w.config.layout === "split" ? (
                <div className="px-8 py-5 text-white" style={{ backgroundColor: accent }}>
                  <div className="text-lg font-semibold">{w.config.name || "Get in touch"}</div>
                  {w.config.subtitle ? <div className="text-sm text-white/80">{w.config.subtitle}</div> : null}
                </div>
              ) : null}
              <div className="p-8">
                {w.config.layout !== "split" ? (
                  <>
                    <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                      {w.config.name || "Get in touch"}
                    </h3>
                    {w.config.subtitle ? (
                      <p className="text-sm text-[var(--color-muted)]">{w.config.subtitle}</p>
                    ) : null}
                  </>
                ) : null}
                <div className={w.config.layout !== "split" ? "mt-4 space-y-3" : "space-y-3"}>
                  {(fields.length ? fields : DEFAULT_FIELDS).map((f) => (
                    <div key={f.id}>
                      <label className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">
                        {f.label}
                        {f.required ? " *" : ""}
                      </label>
                      {f.type === "textarea" ? (
                        <textarea
                          rows={3}
                          className="tl-focus w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                          placeholder={f.placeholder}
                          value={values[f.label] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.label]: e.target.value }))}
                        />
                      ) : (
                        <input
                          type={f.type}
                          className="tl-focus w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                          placeholder={f.placeholder}
                          value={values[f.label] ?? ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.label]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                  <button
                    className="w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: accent }}
                    disabled={busy || missingRequired}
                    onClick={submit}
                  >
                    {busy ? "Sending…" : w.config.submitLabel || "Submit"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
