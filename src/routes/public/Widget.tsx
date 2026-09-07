// Public capture widget: the shareable vCard / lead form a business sends to
// customers. Reads a single widget by id (anon-readable) and renders it.
import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import { select, serverCall } from "../../lib/supabase";
import { Button, Card, Field, Input } from "../../components/ui";

interface WidgetRow {
  id: string;
  kind: string;
  workspace_id: string;
  config: { name?: string; phone?: string };
}

export default function PublicWidget({ id }: { id: string }) {
  const [w, setW] = useState<WidgetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    select<WidgetRow>("capture_widgets", `select=*&id=eq.${id}`).then((rows) => {
      setW(rows[0] ?? null);
      setLoading(false);
    });
  }, [id]);

  async function submit() {
    if (!w || !name.trim()) return;
    await serverCall(`/capture/${w.id}`, { name: name.trim(), phone: phone.trim() });
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
        <Card className="w-full max-w-sm p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-50)] text-[var(--color-brand)]">
                <Icon.Check size={22} />
              </div>
              <h3 className="mt-3 text-base">Thank you!</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">We'll be in touch shortly.</p>
            </div>
          ) : (
            <>
              <h3 className="text-base">{w.config.name || "Get in touch"}</h3>
              <div className="mt-4 space-y-3">
                <Field label="Your name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </Field>
                <Field label="WhatsApp number">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" />
                </Field>
                <Button className="w-full" disabled={!name.trim()} onClick={submit}>
                  Send
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
