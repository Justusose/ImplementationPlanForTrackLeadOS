// Capture Widgets: a full form builder for vCards and embeddable web forms.
// Forms support custom fields, layout designs and an accent colour, are saved to
// capture_widgets and can be reused, re-shared, edited and deleted.
import { useState } from "react";
import { Icon } from "../../lib/icons";
import { del, insert, update } from "../../lib/supabase";
import { useTable } from "../../lib/useData";
import { Badge, Button, Card, Field, Input, PageHeader, cx } from "../../components/ui";

type FieldType = "text" | "email" | "tel" | "textarea";

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder: string;
}

type Layout = "card" | "minimal" | "split";

interface FormConfig {
  name: string;
  subtitle: string;
  fields: FormField[];
  layout: Layout;
  accent: string;
  submitLabel: string;
}

interface WidgetRow {
  id: string;
  kind: string;
  config: any;
  created_at: string;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "textarea", label: "Message" },
];

const LAYOUTS: { value: Layout; label: string; hint: string }[] = [
  { value: "card", label: "Card", hint: "Elevated, centered" },
  { value: "minimal", label: "Minimal", hint: "Flat, borderless" },
  { value: "split", label: "Split", hint: "Accent header panel" },
];

const ACCENTS = ["#4f46e5", "#0ea5e9", "#059669", "#db2777", "#ea580c", "#0f172a"];

let fid = 0;
const newField = (partial?: Partial<FormField>): FormField => ({
  id: `f${Date.now()}_${fid++}`,
  label: "New field",
  type: "text",
  required: false,
  placeholder: "",
  ...partial,
});

const blankForm = (): FormConfig => ({
  name: "Get in touch",
  subtitle: "We'll reply within minutes.",
  fields: [
    newField({ label: "Full name", type: "text", required: true, placeholder: "Your name" }),
    newField({ label: "Phone", type: "tel", required: true, placeholder: "+234…" }),
  ],
  layout: "card",
  accent: ACCENTS[0],
  submitLabel: "Submit",
});

export default function Widgets() {
  const [tab, setTab] = useState<"form" | "vcard">("form");

  return (
    <div>
      <PageHeader
        title="Capture Widgets"
        subtitle="Design vCards and embeddable web forms that funnel straight into your pipeline."
      />

      <div className="mb-5 inline-flex rounded-xl border border-[var(--color-line)] bg-white p-1">
        {(["form", "vcard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "tl-focus rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-[var(--color-brand)] text-white"
                : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]",
            )}
          >
            {t === "vcard" ? "vCard" : "Form builder"}
          </button>
        ))}
      </div>

      {tab === "form" ? <FormBuilder /> : <VCardBuilder />}
    </div>
  );
}

function FormBuilder() {
  const { rows, refetch } = useTable<WidgetRow>(
    "capture_widgets",
    "select=*&kind=eq.form&order=created_at.desc",
  );
  const [config, setConfig] = useState<FormConfig>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormConfig>(k: K, v: FormConfig[K]) {
    setConfig((c) => ({ ...c, [k]: v }));
  }
  function setField(id: string, patch: Partial<FormField>) {
    setConfig((c) => ({ ...c, fields: c.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  }
  function removeField(id: string) {
    setConfig((c) => ({ ...c, fields: c.fields.filter((f) => f.id !== id) }));
  }
  function move(id: string, dir: -1 | 1) {
    setConfig((c) => {
      const i = c.fields.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.fields.length) return c;
      const fields = [...c.fields];
      [fields[i], fields[j]] = [fields[j], fields[i]];
      return { ...c, fields };
    });
  }

  function reset() {
    setConfig(blankForm());
    setEditingId(null);
  }

  function loadForm(w: WidgetRow) {
    setConfig({ ...blankForm(), ...(w.config as FormConfig) });
    setEditingId(w.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!config.name.trim() || config.fields.length === 0) return;
    setBusy(true);
    if (editingId) {
      await update("capture_widgets", `id=eq.${editingId}`, { config });
    } else {
      const w = await insert<WidgetRow>("capture_widgets", { kind: "form", config });
      if (w) setEditingId(w.id);
    }
    setBusy(false);
    refetch();
  }

  async function remove(id: string) {
    await del("capture_widgets", `id=eq.${id}`);
    if (editingId === id) reset();
    refetch();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      {/* Builder */}
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base">{editingId ? "Editing form" : "New form"}</h3>
            {editingId ? (
              <Button size="sm" variant="ghost" onClick={reset}>
                <Icon.Plus size={14} /> New
              </Button>
            ) : null}
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Form title">
              <Input value={config.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Subtitle">
              <Input value={config.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </Field>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Layout design</span>
              <div className="grid grid-cols-3 gap-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => set("layout", l.value)}
                    className={cx(
                      "tl-focus rounded-xl border p-3 text-left transition-colors",
                      config.layout === l.value
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-50)]"
                        : "border-[var(--color-line)] hover:bg-[var(--color-line-soft)]",
                    )}
                  >
                    <div className="text-sm font-semibold text-[var(--color-ink)]">{l.label}</div>
                    <div className="text-xs text-[var(--color-muted)]">{l.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Accent colour</span>
              <div className="flex gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => set("accent", a)}
                    aria-label={`Accent ${a}`}
                    className={cx(
                      "tl-focus h-7 w-7 rounded-full ring-2 ring-offset-2 transition-transform",
                      config.accent === a ? "scale-110 ring-[var(--color-ink)]" : "ring-transparent",
                    )}
                    style={{ backgroundColor: a }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base">Fields</h3>
            <Button size="sm" variant="secondary" onClick={() => set("fields", [...config.fields, newField()])}>
              <Icon.Plus size={14} /> Add field
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {config.fields.map((f, i) => (
              <div key={f.id} className="rounded-xl border border-[var(--color-line)] p-3">
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    value={f.label}
                    onChange={(e) => setField(f.id, { label: e.target.value })}
                    placeholder="Field label"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => setField(f.id, { type: e.target.value as FieldType })}
                    className="tl-focus rounded-lg border border-[var(--color-line)] bg-white px-2 text-sm"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => setField(f.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(f.id, -1)} aria-label="Move up">
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={i === config.fields.length - 1}
                      onClick={() => move(f.id, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeField(f.id)} aria-label="Remove field">
                      <Icon.Trash size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {config.fields.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-faint)]">Add at least one field.</p>
            ) : null}
          </div>
          <Field label="Submit button label" hint="">
            <Input
              className="mt-3"
              value={config.submitLabel}
              onChange={(e) => set("submitLabel", e.target.value)}
            />
          </Field>
          <Button
            className="mt-4 w-full"
            disabled={busy || !config.name.trim() || config.fields.length === 0}
            onClick={save}
          >
            {busy ? "Saving…" : editingId ? "Update form" : "Save form"}
          </Button>
        </Card>
      </div>

      {/* Preview + saved */}
      <div className="space-y-4">
        <Card className="bg-[var(--color-canvas)] p-6">
          <span className="mb-3 block text-xs font-medium text-[var(--color-faint)]">Live preview</span>
          <FormPreview config={config} />
          {editingId ? <ShareBlock id={editingId} /> : null}
        </Card>

        <Card className="p-6">
          <h3 className="text-base">Saved forms</h3>
          {rows.length === 0 ? (
            <p className="mt-4 text-center text-sm text-[var(--color-faint)]">
              No saved forms yet. Build one and hit Save form to reuse it anywhere.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-line)]">
              {rows.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--color-ink)]">
                      {w.config?.name ?? "Untitled form"}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {(w.config?.fields?.length ?? 0)} fields · {w.config?.layout ?? "card"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {editingId === w.id ? <Badge tone="brand">Editing</Badge> : null}
                    <Button size="sm" variant="ghost" onClick={() => loadForm(w)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(w.id)} aria-label="Delete form">
                      <Icon.Trash size={15} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export function FormPreview({ config }: { config: FormConfig }) {
  const split = config.layout === "split";
  const minimal = config.layout === "minimal";
  return (
    <div
      className={cx(
        "mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white",
        minimal ? "border border-[var(--color-line)]" : "shadow-[var(--tl-shadow-lg)]",
      )}
    >
      {split ? (
        <div className="px-6 py-5 text-white" style={{ backgroundColor: config.accent }}>
          <div className="text-lg font-semibold">{config.name}</div>
          <div className="text-sm text-white/80">{config.subtitle}</div>
        </div>
      ) : null}
      <div className="p-6">
        {!split ? (
          <>
            <div className="text-lg font-semibold text-[var(--color-ink)]">{config.name}</div>
            <div className="text-sm text-[var(--color-muted)]">{config.subtitle}</div>
          </>
        ) : null}
        <div className={cx("space-y-3", !split && "mt-4")}>
          {config.fields.map((f) => (
            <div key={f.id}>
              <label className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">
                {f.label}
                {f.required ? " *" : ""}
              </label>
              {f.type === "textarea" ? (
                <div className="h-16 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]" />
              ) : (
                <div className="h-9 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]" />
              )}
            </div>
          ))}
          <button
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: config.accent }}
          >
            {config.submitLabel || "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareBlock({ id }: { id: string }) {
  const url = `${window.location.origin}/w/${id}`;
  return (
    <div className="mt-4 rounded-xl border border-[var(--color-line)] bg-white p-3">
      <p className="text-xs font-medium text-[var(--color-ink-soft)]">Shareable link</p>
      <div className="mt-1 break-all text-xs tl-mono text-[var(--color-brand-700)]">{url}</div>
      <Button
        size="sm"
        variant="secondary"
        className="mt-2"
        onClick={() => navigator.clipboard?.writeText(url)}
      >
        <Icon.Copy size={14} /> Copy link
      </Button>
    </div>
  );
}

function VCardBuilder() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const w = await insert<WidgetRow>("capture_widgets", {
      kind: "vcard",
      config: { name: name.trim(), phone: phone.trim() },
    });
    setBusy(false);
    if (w) setShareId(w.id);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-base">Digital business card</h3>
        <div className="mt-5 space-y-4">
          <Field label="Display name">
            <Input placeholder="Ada's Fabrics" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="WhatsApp number" hint="Leads tap once to start a chat.">
            <Input placeholder="+234 801 234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Button className="w-full" onClick={create} disabled={busy || !name.trim()}>
            <Icon.Widget size={16} /> {busy ? "Creating…" : "Create vCard"}
          </Button>
          {shareId ? <ShareBlock id={shareId} /> : null}
        </div>
      </Card>

      <Card className="flex items-center justify-center bg-[var(--color-canvas)] p-6">
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
      </Card>
    </div>
  );
}
