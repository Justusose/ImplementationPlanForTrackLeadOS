// Custom UI primitives matching the TrackLead premium SaaS stance.
import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Icon } from "../lib/icons";

function cx(...parts: (string | false | undefined | null)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "wa" | "danger";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const variants: Record<Variant, string> = {
    primary:
      "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-700)] shadow-[var(--tl-shadow-sm)]",
    secondary:
      "bg-white text-[var(--color-ink)] border border-[var(--color-line)] hover:bg-[var(--color-canvas)]",
    ghost: "text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]",
    wa: "bg-[var(--color-wa)] text-white hover:bg-[var(--color-wa-dark)] shadow-[var(--tl-shadow-sm)]",
    danger: "bg-[var(--color-danger)] text-white hover:brightness-95",
  };
  const sizes = {
    sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
    md: "h-10 px-4 text-sm rounded-xl gap-2",
    lg: "h-12 px-6 text-[15px] rounded-xl gap-2",
  };
  return (
    <button
      className={cx(
        "tl-focus inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("tl-card", className)}>{children}</div>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "wa";
}) {
  const tones = {
    neutral: "bg-[var(--color-line-soft)] text-[var(--color-ink-soft)]",
    brand: "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    wa: "bg-[#e7f9ee] text-[var(--color-wa-dark)]",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-[var(--color-ink-soft)]">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[var(--color-faint)]">{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "tl-focus h-10 w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-faint)] transition-colors focus:border-[var(--color-brand)]",
        props.className,
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "tl-focus w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-faint)] transition-colors focus:border-[var(--color-brand)]",
        props.className,
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="tl-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] bg-white/60 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-50)] text-[var(--color-brand)]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--color-muted)]">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={cx(
        "fixed inset-0 z-50 transition-opacity duration-300",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cx(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-[var(--tl-shadow-lg)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
          <div className="min-w-0">{title}</div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <Icon.X size={18} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-[var(--color-line)] px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean } | null;
  icon: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-[var(--color-muted)]">{label}</span>
        <span className="text-[var(--color-faint)]">{icon}</span>
      </div>
      <div className="mt-3 tl-mono text-2xl font-semibold tracking-tight text-[var(--color-ink)] md:text-3xl">
        {value}
      </div>
      {delta ? (
        <div
          className={cx(
            "mt-1.5 inline-flex items-center gap-1 text-xs font-medium",
            delta.positive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]",
          )}
        >
          {delta.positive ? "▲" : "▼"} {delta.value}
        </div>
      ) : (
        <div className="mt-1.5 text-xs text-[var(--color-faint)]">Awaiting live data</div>
      )}
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="tl-h2">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export { cx };
