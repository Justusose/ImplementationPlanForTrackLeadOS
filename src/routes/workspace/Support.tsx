// Support Inbox for owners & staff: open tickets and exchange messages with the
// TrackLead (super admin) team. Messages persist to support_messages (realtime).
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../lib/icons";
import { useAuth } from "../../lib/auth";
import { currentWorkspaceId, insert, select } from "../../lib/supabase";
import { Badge, Button, Card, Field, Input, PageHeader, Textarea, cx } from "../../components/ui";

export interface Ticket {
  id: string;
  subject: string;
  body: string | null;
  status: string;
  workspace_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  sender_role: string;
  body: string;
  created_at: string;
}

export default function Support() {
  const { role, session } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<Ticket | null>(null);
  const [subject, setSubject] = useState("");
  const [firstMsg, setFirstMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const rows = await select<Ticket>("support_tickets", "select=*&order=created_at.desc");
    setTickets(rows);
    setActive((a) => (a ? rows.find((t) => t.id === a.id) ?? a : rows[0] ?? null));
  }

  useEffect(() => {
    load();
  }, []);

  async function createTicket() {
    if (!subject.trim() || !firstMsg.trim()) return;
    setBusy(true);
    const ws = currentWorkspaceId();
    const ticket = await insert<Ticket>("support_tickets", {
      workspace_id: ws,
      subject: subject.trim(),
      body: firstMsg.trim(),
      status: "open",
    });
    if (ticket) {
      await insert("support_messages", {
        ticket_id: ticket.id,
        workspace_id: ws,
        sender_role: role,
        sender_id: session?.user.id,
        body: firstMsg.trim(),
      });
    }
    setBusy(false);
    setSubject("");
    setFirstMsg("");
    setCreating(false);
    await load();
    if (ticket) setActive(ticket);
  }

  return (
    <div>
      <PageHeader
        title="Support Inbox"
        subtitle="Message the TrackLead team directly — we usually reply within a few hours."
        action={
          <Button onClick={() => setCreating(true)}>
            <Icon.Plus size={16} /> New message
          </Button>
        }
      />

      {creating ? (
        <Card className="mb-4 p-6">
          <h3 className="text-base">Start a new conversation</h3>
          <div className="mt-4 space-y-3">
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Billing question" />
            </Field>
            <Field label="Message">
              <Textarea
                rows={4}
                value={firstMsg}
                onChange={(e) => setFirstMsg(e.target.value)}
                placeholder="How can we help?"
              />
            </Field>
            <div className="flex gap-2">
              <Button disabled={busy || !subject.trim() || !firstMsg.trim()} onClick={createTicket}>
                {busy ? "Sending…" : "Send"}
              </Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {tickets.length === 0 && !creating ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-50)] text-[var(--color-brand)]">
            <Icon.Inbox size={26} />
          </div>
          <h3 className="text-lg">No conversations yet</h3>
          <p className="mt-1.5 max-w-sm text-sm text-[var(--color-muted)]">
            Questions about billing, features or your account? Start a message and the TrackLead team
            will get back to you.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-[var(--color-line)]">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActive(t)}
                    className={cx(
                      "tl-focus w-full px-4 py-3 text-left transition-colors",
                      active?.id === t.id ? "bg-[var(--color-brand-50)]" : "hover:bg-[var(--color-line-soft)]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[var(--color-ink)]">
                        {t.subject}
                      </span>
                      <Badge tone={t.status === "open" ? "warning" : "success"}>{t.status}</Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {active ? (
            <Thread
              ticket={active}
              senderRole={role ?? "owner"}
              senderId={session?.user.id ?? null}
            />
          ) : (
            <Card className="flex items-center justify-center p-10 text-sm text-[var(--color-faint)]">
              Select a conversation
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Shared message thread — reused by the super-admin support page.
export function Thread({
  ticket,
  senderRole,
  senderId,
}: {
  ticket: Ticket;
  senderRole: string;
  senderId: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const rows = await select<Message>(
      "support_messages",
      `select=*&ticket_id=eq.${ticket.id}&order=created_at.asc`,
    );
    setMessages(rows);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 6000); // lightweight polling for two-way replies
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!draft.trim()) return;
    setBusy(true);
    await insert("support_messages", {
      ticket_id: ticket.id,
      workspace_id: ticket.workspace_id,
      sender_role: senderRole,
      sender_id: senderId,
      body: draft.trim(),
    });
    setDraft("");
    setBusy(false);
    await load();
  }

  const mine = (m: Message) => m.sender_role === senderRole;

  return (
    <Card className="flex h-[560px] flex-col p-0">
      <div className="border-b border-[var(--color-line)] px-5 py-3">
        <div className="text-sm font-semibold text-[var(--color-ink)]">{ticket.subject}</div>
        <div className="text-xs text-[var(--color-muted)]">Ticket #{ticket.id.slice(0, 8)}</div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m) => (
          <div key={m.id} className={cx("flex", mine(m) ? "justify-end" : "justify-start")}>
            <div
              className={cx(
                "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                mine(m)
                  ? "bg-[var(--color-brand)] text-white"
                  : "bg-[var(--color-line-soft)] text-[var(--color-ink)]",
              )}
            >
              <div
                className={cx(
                  "mb-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  mine(m) ? "text-white/70" : "text-[var(--color-faint)]",
                )}
              >
                {m.sender_role === "super_admin" ? "TrackLead team" : m.sender_role}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-[var(--color-line)] p-3">
        <Textarea
          rows={2}
          className="flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
        />
        <Button disabled={busy || !draft.trim()} onClick={send}>
          Send
        </Button>
      </div>
    </Card>
  );
}
