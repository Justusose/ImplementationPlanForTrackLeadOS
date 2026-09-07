// Public landing page: hero, features matrix, pricing (live from subscription_plans), footer.
import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import { Link } from "../../lib/router";
import { select } from "../../lib/supabase";
import { Logo } from "../../components/AppShell";
import { Badge, Button, Card, cx } from "../../components/ui";

interface Plan {
  id: string;
  name: string;
  price_ngn: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
}

// Blueprint default tiers — Super Admin can edit these live via subscription_plans.
const DEFAULT_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price_ngn: 5500,
    tagline: "For solo founders capturing their first leads.",
    features: ["1 workspace", "WhatsApp CRM pipeline", "500 leads / mo", "1 Smart Link", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    price_ngn: 15500,
    tagline: "For growing teams closing more deals.",
    features: [
      "Everything in Starter",
      "Social Radar (Meta)",
      "5 team seats",
      "Unlimited leads",
      "Web visitor tracking",
      "Campaign attribution",
    ],
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    price_ngn: 35000,
    tagline: "For established businesses scaling acquisition.",
    features: [
      "Everything in Growth",
      "Unlimited seats",
      "All integrations",
      "Priority support",
      "Custom capture widgets",
      "Advanced ROI analytics",
    ],
  },
];

const FEATURES = [
  {
    icon: "Radar" as const,
    title: "Social Radar",
    body: "Capture every comment, DM and mention across Instagram, Facebook & TikTok via the Meta Graph API. Turn passive lurkers into a warm lead list.",
  },
  {
    icon: "Whatsapp" as const,
    title: "WhatsApp CRM",
    body: "A visual Kanban pipeline built for how African business actually closes — one tap opens the chat, right where the deal happens.",
  },
  {
    icon: "Globe" as const,
    title: "Web Tracking",
    body: "See live visitors on your site in real time. Know who's interested before they even reach out.",
  },
  {
    icon: "Link" as const,
    title: "Smart Links",
    body: "Generate UTM-tracked links to prove exact ROI on every Naira of ad spend — from ad click to closed deal.",
  },
];

function formatNaira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

export default function Landing() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);

  useEffect(() => {
    select<Plan>("subscription_plans", "select=*&order=price_ngn.asc").then((rows) => {
      if (rows.length) setPlans(rows);
    });
  }, []);

  return (
    <div className="min-h-full bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--color-ink-soft)] md:flex">
            <a href="#features" className="hover:text-[var(--color-ink)]">Features</a>
            <a href="#pricing" className="hover:text-[var(--color-ink)]">Pricing</a>
            <Link to="/login" className="hover:text-[var(--color-ink)]">Log in</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Start free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(600px 300px at 70% -10%, rgba(37,99,235,0.10), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <Badge tone="brand">
              <Icon.Spark size={13} /> Built for African SMEs
            </Badge>
            <h1 className="mt-5 max-w-xl">
              Stop Losing Leads.{" "}
              <span className="text-[var(--color-brand)]">Start Closing Deals.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-[var(--color-muted)] md:text-lg">
              TrackLead OS captures every lead from your ads, website and social — then funnels them
              into one simple pipeline you close over WhatsApp. Stop the ad-spend leakage.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/signup">
                <Button size="lg">
                  Start free <Icon.ArrowRight size={18} />
                </Button>
              </Link>
              <a href="#pricing">
                <Button variant="secondary" size="lg">
                  See pricing
                </Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-[var(--color-faint)]">
              Naira billing from ₦5,500/mo · No card required to start
            </p>
          </div>

          {/* Dynamic UI mockup */}
          <div className="relative flex items-center">
            <Card className="w-full overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-[var(--color-faint)]">TrackLead · Pipeline</span>
              </div>
              <div className="grid grid-cols-3 gap-3 bg-[var(--color-canvas)] p-4">
                {[
                  { label: "New", tone: "#3b82f6", cards: ["Ada — IG ad", "Emeka — Website"] },
                  { label: "Negotiating", tone: "#d97706", cards: ["Ngozi — WhatsApp"] },
                  { label: "Won", tone: "#16a34a", cards: ["Tunde — ₦85k"] },
                ].map((col) => (
                  <div key={col.label} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-ink-soft)]">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: col.tone }}
                      />
                      {col.label}
                    </div>
                    {col.cards.map((c) => (
                      <div
                        key={c}
                        className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-2 text-[11px] font-medium text-[var(--color-ink-soft)] shadow-[var(--tl-shadow-sm)]"
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-3">
                <span className="text-xs text-[var(--color-muted)]">Real-time ROI</span>
                <span className="tl-mono text-sm font-semibold text-[var(--color-success)]">
                  +312% ROAS
                </span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-[var(--color-line)] bg-[var(--color-canvas)]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2>Your entire acquisition funnel, in one hub.</h2>
            <p className="mt-3 text-[var(--color-muted)]">
              Four tools working together to plug the gap between marketing spend and closed sales.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Ico = Icon[f.icon];
              return (
                <Card key={f.title} className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand)]">
                    <Ico size={22} />
                  </div>
                  <h3 className="mt-4 text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">{f.body}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-[var(--color-line)]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2>Naira pricing. No FX friction.</h2>
            <p className="mt-3 text-[var(--color-muted)]">
              Enterprise-grade tracking at a price built for local business budgets.
            </p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={cx(
                  "relative flex flex-col p-6",
                  plan.highlighted && "ring-2 ring-[var(--color-brand)]",
                )}
              >
                {plan.highlighted ? (
                  <span className="absolute -top-3 left-6">
                    <Badge tone="brand">Most popular</Badge>
                  </span>
                ) : null}
                <h3 className="text-lg">{plan.name}</h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{plan.tagline}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="tl-mono text-3xl font-bold tracking-tight">
                    {formatNaira(plan.price_ngn)}
                  </span>
                  <span className="mb-1 text-sm text-[var(--color-muted)]">/mo</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                      <Icon.Check size={16} className="mt-0.5 shrink-0 text-[var(--color-brand)]" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="mt-6"
                  onClick={() => sessionStorage.setItem("tl_plan", plan.id)}
                >
                  <Button variant={plan.highlighted ? "primary" : "secondary"} className="w-full">
                    Get started
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-ink)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-16 text-center md:py-20">
          <h2 className="max-w-xl text-white">Every lead captured. Every Naira accounted for.</h2>
          <Link to="/signup">
            <Button size="lg">
              Start free today <Icon.ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-line)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-wrap gap-6 text-sm text-[var(--color-muted)]">
            <Link to="/terms" className="hover:text-[var(--color-ink)]">Terms</Link>
            <Link to="/privacy" className="hover:text-[var(--color-ink)]">Privacy Policy</Link>
            <a href="#pricing" className="hover:text-[var(--color-ink)]">Pricing</a>
          </div>
          <p className="text-xs text-[var(--color-faint)]">
            © {new Date().getFullYear()} TrackLead OS by Kalimb.
          </p>
        </div>
      </footer>
    </div>
  );
}
