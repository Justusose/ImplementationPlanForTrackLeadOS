// The Pipeline (CRM): draggable Kanban board + Lead Details drawer.
// Native HTML5 drag-and-drop; persists to Supabase under workspace RLS.
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { del, insert, select, update } from "../../lib/supabase";
import { useRouter } from "../../lib/router";
import { useTable } from "../../lib/useData";
import { STAGES, type Lead, type Stage } from "../../lib/types";
import { Badge, Button, Drawer, EmptyState, Field, Input, PageHeader, Textarea, cx } from "../../components/ui";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Pipeline({ staff = false }: { staff?: boolean }) {
  const { rows, loading, setRows, refetch } = useTable<Lead>(
    "leads",
    "select=*&order=position.asc",
  );
  const { navigate } = useRouter();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [active, setActive] = useState<Lead | null>(null);
  const [adding, setAdding] = useState(false);

  const byStage = useMemo(() => {
    const map: Record<Stage, Lead[]> = { new: [], contacted: [], negotiating: [], won: [], lost: [] };
    for (const l of rows) map[l.stage]?.push(l);
    return map;
  }, [rows]);

  function moveTo(stage: Stage) {
    if (!dragId) return;
    const lead = rows.find((l) => l.id === dragId);
    if (!lead || lead.stage === stage) return;
    setRows((prev) => prev.map((l) => (l.id === dragId ? { ...l, stage } : l)));
    update("leads", `id=eq.${dragId}`, { stage });
    setDragId(null);
    setOverStage(null);
  }

  async function handleDelete(id: string) {
    setRows((prev) => prev.filter((l) => l.id !== id));
    setActive(null);
    await del("leads", `id=eq.${id}`);
  }

  const isEmpty = !loading && rows.length === 0;

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={staff ? "Move the leads assigned to you." : "Drag leads across your sales stages."}
        action={
          !staff ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Icon.Plus size={16} /> Add lead
            </Button>
          ) : undefined
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={<Icon.Pipeline size={26} />}
          title="You have no leads yet"
          body="Generate a Smart Link or connect your social accounts to start capturing leads straight into your pipeline."
          action={
            !staff ? (
              <div className="flex gap-2">
                <Button onClick={() => setAdding(true)}>
                  <Icon.Plus size={16} /> Add lead
                </Button>
                <Button variant="secondary" onClick={() => navigate("/app/campaigns")}>
                  <Icon.Link size={16} /> Generate a Smart Link
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((col) => (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(col.key);
              }}
              onDragLeave={() => setOverStage((s) => (s === col.key ? null : s))}
              onDrop={() => moveTo(col.key)}
              className={cx(
                "flex w-72 shrink-0 flex-col rounded-2xl border bg-[var(--color-canvas)] transition-colors",
                overStage === col.key
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-50)]"
                  : "border-[var(--color-line)]",
              )}
            >
              <div className="flex items-center justify-between px-3.5 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.tone }} />
                  {col.label}
                </div>
                <span className="tl-mono text-xs text-[var(--color-muted)]">
                  {byStage[col.key].length}
                </span>
              </div>
              <div className="flex-1 space-y-2 px-2.5 pb-3">
                {byStage[col.key].map((lead) => (
                  <button
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setActive(lead)}
                    className={cx(
                      "tl-card w-full cursor-grab p-3 text-left transition-all hover:shadow-[var(--tl-shadow-md)] active:cursor-grabbing",
                      dragId === lead.id && "opacity-40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--color-ink)]">{lead.name}</span>
                      {lead.value ? (
                        <span className="tl-mono text-xs font-semibold text-[var(--color-success)]">
                          ₦{lead.value.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      {lead.source ? <Badge tone="brand">{lead.source}</Badge> : <span />}
                      <span className="text-xs text-[var(--color-faint)]">
                        {timeAgo(lead.created_at)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <LeadDrawer
        lead={active}
        onClose={() => setActive(null)}
        staff={staff}
        onDelete={handleDelete}
      />
      <AddLeadDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => {
          setAdding(false);
          refetch();
        }}
      />
    </div>
  );
}

function AddLeadDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    await insert("leads", {
      name: name.trim(),
      phone: phone.trim() || null,
      source: source.trim() || null,
      value: value ? Number(value) : null,
      stage: "new",
    });
    setBusy(false);
    setName("");
    setPhone("");
    setSource("");
    setValue("");
    onCreated();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={<div className="text-base font-semibold text-[var(--color-ink)]">Add a lead</div>}
      footer={
        <Button className="w-full" onClick={save} disabled={busy || !name.trim()}>
          {busy ? "Saving…" : "Save lead"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input placeholder="Ada Okafor" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="WhatsApp number" hint="Include country code for the one-tap chat button.">
          <Input placeholder="+234 801 234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Source">
          <Input placeholder="Instagram ad" value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
        <Field label="Estimated value (₦)">
          <Input type="number" placeholder="85000" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      </div>
    </Drawer>
  );
}

interface Note {
  id: string;
  body: string;
  created_at: string;
}

function LeadDrawer({
  lead,
  onClose,
  staff,
  onDelete,
}: {
  lead: Lead | null;
  onClose: () => void;
  staff: boolean;
  onDelete: (id: string) => void;
}) {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setNotes([]);
    select<Note>("lead_notes", `select=id,body,created_at&lead_id=eq.${lead.id}&order=created_at.desc`).then(
      setNotes,
    );
  }, [lead]);

  async function saveNote() {
    if (!lead || !note.trim()) return;
    setBusy(true);
    const created = await insert<Note>("lead_notes", { lead_id: lead.id, body: note.trim() });
    setBusy(false);
    if (created) {
      setNotes((prev) => [created, ...prev]);
      setNote("");
    }
  }

  return (
    <Drawer
      open={!!lead}
      onClose={onClose}
      title={
        lead ? (
          <div>
            <div className="text-base font-semibold text-[var(--color-ink)]">{lead.name}</div>
            <div className="text-xs text-[var(--color-muted)]">{lead.phone ?? "No phone on file"}</div>
          </div>
        ) : null
      }
      footer={
        lead ? (
          <div className="flex gap-2">
            <a
              className="flex-1"
              href={lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, "")}` : "#"}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="wa" className="w-full">
                <Icon.Whatsapp size={18} /> Open WhatsApp
              </Button>
            </a>
            {!staff ? (
              <Button variant="danger" onClick={() => onDelete(lead.id)} aria-label="Delete lead">
                <Icon.X size={16} /> Delete
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {lead ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Meta label="Stage" value={STAGES.find((s) => s.key === lead.stage)?.label ?? lead.stage} />
            <Meta label="Source" value={lead.source ?? "—"} />
            <Meta label="Campaign" value={lead.campaign ?? "—"} />
            <Meta label="Value" value={lead.value ? `₦${lead.value.toLocaleString()}` : "—"} />
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink)]">
              <Icon.Note size={15} /> Sales notes
            </h4>
            <Field label="">
              <Textarea
                rows={3}
                placeholder="Add a note about this lead…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={!note.trim() || busy}
              onClick={saveNote}
            >
              {busy ? "Saving…" : "Save note"}
            </Button>

            {notes.length ? (
              <ul className="mt-4 space-y-2">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-3"
                  >
                    <p className="text-sm text-[var(--color-ink-soft)]">{n.body}</p>
                    <p className="mt-1 text-xs text-[var(--color-faint)]">{timeAgo(n.created_at)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {staff ? (
            <p className="text-xs text-[var(--color-faint)]">
              As a sales rep you can move leads and add notes, but cannot delete them.
            </p>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-faint)]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-[var(--color-ink)]">{value}</div>
    </div>
  );
}
