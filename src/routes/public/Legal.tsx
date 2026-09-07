// Terms & Privacy legal pages.
import { Link } from "../../lib/router";
import { Logo } from "../../components/AppShell";

export default function Legal({ kind }: { kind: "terms" | "privacy" }) {
  const title = kind === "terms" ? "Terms of Service" : "Privacy Policy";
  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-[var(--color-line)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            ← Home
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="tl-h1">{title}</h1>
        <p className="mt-3 text-sm text-[var(--color-faint)]">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-[var(--color-ink-soft)]">
          <p>
            This {title.toLowerCase()} governs your use of TrackLead OS, an omni-channel lead
            intelligence and micro-CRM platform operated by Kalimb. By creating an account you agree
            to these terms.
          </p>
          <h3 className="tl-h3 pt-2">Data & tenancy</h3>
          <p>
            Each workspace's data is strictly isolated. We enforce row-level security so that no
            business can access another business's leads, campaigns, or customer conversations.
          </p>
          <h3 className="tl-h3 pt-2">Integrations</h3>
          <p>
            When you connect Meta, TikTok, X, LinkedIn or Instagram, you authorize TrackLead OS to
            read engagements on your behalf solely to surface them in your Radar. You can revoke
            access at any time from Settings.
          </p>
          <h3 className="tl-h3 pt-2">Billing</h3>
          <p>
            Subscriptions are billed monthly in Naira via Paystack/Flutterwave. You may cancel at any
            time; access continues until the end of the current billing period.
          </p>
        </div>
      </article>
    </div>
  );
}
