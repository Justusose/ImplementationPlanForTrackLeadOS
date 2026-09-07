// Auth screens: login, signup, forgot password, magic-link verify. Also a role
// preview switcher so the product is fully navigable before Supabase is connected.
import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Link, useRouter } from "../../lib/router";
import { useAuth, roleHome } from "../../lib/auth";
import { resetPassword, type Role } from "../../lib/supabase";
import { Logo } from "../../components/AppShell";
import { Button, Card, Field, Input, cx } from "../../components/ui";

type Mode = "login" | "signup" | "forgot" | "verify";

export default function Auth({ mode }: { mode: Mode }) {
  const { signIn, signUp, previewAs, configured } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy: Record<Mode, { title: string; sub: string }> = {
    login: { title: "Welcome back", sub: "Log in to your TrackLead workspace." },
    signup: { title: "Create your account", sub: "Start capturing leads in minutes." },
    forgot: { title: "Reset your password", sub: "We'll email you a secure reset link." },
    verify: { title: "Check your email", sub: "We sent you a magic link to sign in." },
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    if (mode === "login") {
      const res = await signIn(email, password);
      if (res.error) setError(res.error);
      else navigate(roleHome[localStorageRole() ?? "owner"]);
    } else if (mode === "signup") {
      const plan = sessionStorage.getItem("tl_plan") ?? undefined;
      sessionStorage.removeItem("tl_plan");
      const res = await signUp(email, password, plan ? { plan } : undefined);
      if (res.error) setError(res.error);
      else if (res.confirmed) navigate(roleHome[localStorageRole() ?? "owner"]);
      else navigate("/verify");
    } else if (mode === "forgot") {
      const res = await resetPassword(email);
      if (res.error) setError(res.error);
      else setNotice("If that email exists, a reset link is on its way.");
    }
    setBusy(false);
  }

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col px-5 py-6 lg:px-16">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm py-10">
            <h1 className="tl-h2">{copy[mode].title}</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{copy[mode].sub}</p>

            {mode === "verify" ? (
              <Card className="mt-8 flex flex-col items-center p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-50)] text-[var(--color-brand)]">
                  <Icon.Inbox size={24} />
                </div>
                <p className="mt-4 text-sm text-[var(--color-muted)]">
                  Click the link in your inbox to finish signing in.
                </p>
                <Link to="/login" className="mt-6">
                  <Button variant="secondary" className="w-full">Back to login</Button>
                </Link>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <Field label="Email">
                  <Input
                    type="email"
                    required
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                {mode !== "forgot" ? (
                  <Field label="Password">
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                ) : null}

                {error ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                ) : null}
                {notice ? (
                  <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>
                ) : null}

                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : mode === "login"
                      ? "Log in"
                      : mode === "signup"
                        ? "Create account"
                        : "Send reset link"}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  {mode === "login" ? (
                    <>
                      <Link to="/forgot" className="text-[var(--color-brand)] hover:underline">
                        Forgot password?
                      </Link>
                      <Link to="/signup" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                        Create account
                      </Link>
                    </>
                  ) : (
                    <Link to="/login" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                      ← Back to login
                    </Link>
                  )}
                </div>
              </form>
            )}

            {/* Role preview switcher — only before Supabase is connected. */}
            {mode === "login" && !configured ? (
              <div className="mt-10 rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-canvas)] p-4">
                <p className="text-xs font-medium text-[var(--color-ink-soft)]">
                  Explore the product by role
                </p>
                <p className="mt-1 text-xs text-[var(--color-faint)]">
                  Supabase isn't connected yet — explore each role's experience.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["owner", "staff", "super_admin"] as Role[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        previewAs(r);
                        navigate(roleHome[r]);
                      }}
                      className={cx(
                        "tl-focus rounded-lg border border-[var(--color-line)] bg-white px-2 py-2 text-xs font-medium capitalize text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]",
                      )}
                    >
                      {r.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden overflow-hidden bg-[var(--color-ink)] lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(500px 400px at 30% 20%, rgba(37,99,235,0.35), transparent 60%), radial-gradient(400px 400px at 80% 80%, rgba(37,211,102,0.18), transparent 60%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-14">
          <div />
          <div>
            <h2 className="max-w-md text-white">
              The operating system for SME growth in emerging markets.
            </h2>
            <p className="mt-4 max-w-sm text-white/70">
              From ad click to closed WhatsApp deal — TrackLead OS tracks every step so you never
              lose another lead.
            </p>
          </div>
          <div className="flex gap-8 text-white/80">
            <div>
              <div className="tl-mono text-2xl font-semibold text-white">312%</div>
              <div className="text-xs">Avg. ROAS lift</div>
            </div>
            <div>
              <div className="tl-mono text-2xl font-semibold text-white">₦5,500</div>
              <div className="text-xs">Starting price</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function localStorageRole(): Role | null {
  try {
    const raw = localStorage.getItem("tl_session");
    return raw ? (JSON.parse(raw).role as Role) : null;
  } catch {
    return null;
  }
}
