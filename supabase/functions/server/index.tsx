import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const P = "/make-server-e8aa61da";

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Service-role client — bypasses RLS. Never expose this key to the browser.
const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

/** Resolve the calling user + their JWT claims from the Authorization header. */
async function caller(c: any) {
  const auth = c.req.header("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) return null;
  const meta = data.user.app_metadata ?? {};
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    role: (meta.role as string) ?? "owner",
    workspace_id: (meta.workspace_id as string) ?? null,
  };
}

app.get(`${P}/health`, (c) => c.json({ status: "ok" }));

// ---------- Billing: initialize a Paystack checkout ----------------------
app.post(`${P}/billing/paystack/init`, async (c) => {
  const user = await caller(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key) return c.json({ error: "Billing is not configured yet." }, 400);

  const { plan } = await c.req.json().catch(() => ({}));
  const sb = admin();
  const { data: planRow } = await sb
    .from("subscription_plans")
    .select("id,name,price_ngn")
    .eq("id", plan)
    .maybeSingle();
  if (!planRow) return c.json({ error: "Unknown plan." }, 400);

  const origin = c.req.header("origin") ?? "";
  const init = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      amount: planRow.price_ngn * 100, // kobo
      currency: "NGN",
      callback_url: `${origin}/app/settings`,
      metadata: { workspace_id: user.workspace_id, plan: planRow.id, user_id: user.id },
    }),
  });
  const body = await init.json().catch(() => ({}));
  if (!init.ok || !body?.status) {
    return c.json({ error: body?.message ?? "Could not start checkout." }, 400);
  }
  return c.json({ authorization_url: body.data.authorization_url });
});

// ---------- Team: invite a staff member ----------------------------------
app.post(`${P}/team/invite`, async (c) => {
  const user = await caller(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (user.role !== "owner" && user.role !== "super_admin") {
    return c.json({ error: "Only owners can invite team members." }, 403);
  }
  const { email } = await c.req.json().catch(() => ({}));
  if (!email) return c.json({ error: "Email is required." }, 400);

  const sb = admin();
  // Pre-create the pending membership so the signup trigger attaches them as staff.
  await sb.from("workspace_members").upsert(
    { workspace_id: user.workspace_id, email, role: "staff", status: "invited" },
    { onConflict: "workspace_id,email" },
  );

  const origin = c.req.header("origin") ?? "";
  const { error } = await sb.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/login`,
    data: { invited_to: user.workspace_id },
  });
  // A duplicate invite (user already exists) is not fatal — the membership stands.
  if (error && !/already/i.test(error.message)) {
    return c.json({ error: error.message }, 400);
  }
  return c.json({ ok: true });
});

// ---------- Super admin: impersonate ("Login as") ------------------------
app.post(`${P}/admin/impersonate`, async (c) => {
  const user = await caller(c);
  if (!user || user.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  const { email } = await c.req.json().catch(() => ({}));
  if (!email) return c.json({ error: "Email is required." }, 400);

  const origin = c.req.header("origin") ?? "";
  const { data, error } = await admin().auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${origin}/login` },
  });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ action_link: data.properties?.action_link });
});

// ---------- Super admin: manage a tenant ---------------------------------
app.post(`${P}/admin/tenant/:id`, async (c) => {
  const user = await caller(c);
  if (!user || user.role !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  const id = c.req.param("id");
  const patch = await c.req.json().catch(() => ({}));
  const allowed: Record<string, unknown> = {};
  if (typeof patch.billing_status === "string") allowed.billing_status = patch.billing_status;
  if (typeof patch.plan === "string") allowed.plan = patch.plan;

  const { error } = await admin().from("workspaces").update(allowed).eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ---------- Public capture: a visitor submits a widget form --------------
// No auth: the widget id maps to a workspace, and we insert with service role.
app.post(`${P}/capture/:widgetId`, async (c) => {
  const widgetId = c.req.param("widgetId");
  const { name, phone } = await c.req.json().catch(() => ({}));
  if (!name) return c.json({ error: "Name is required." }, 400);

  const sb = admin();
  const { data: widget } = await sb
    .from("capture_widgets")
    .select("workspace_id")
    .eq("id", widgetId)
    .maybeSingle();
  if (!widget) return c.json({ error: "Unknown capture link." }, 404);

  const { error } = await sb.from("leads").insert({
    workspace_id: widget.workspace_id,
    name,
    phone: phone ?? null,
    source: "capture-form",
    stage: "new",
  });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ---------- OAuth: begin an integration connect --------------------------
// Returns the provider authorize URL. Completes once the app is approved.
app.post(`${P}/oauth/:provider/start`, async (c) => {
  const user = await caller(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const provider = c.req.param("provider");
  const origin = c.req.header("origin") ?? "";
  const redirect = `${Deno.env.get("SUPABASE_URL")}/functions/v1/make-server-e8aa61da/oauth/${provider}/callback`;
  const state = btoa(JSON.stringify({ ws: user.workspace_id, origin }));

  const map: Record<string, string | undefined> = {
    meta: Deno.env.get("META_APP_ID"),
    facebook: Deno.env.get("META_APP_ID"),
    instagram: Deno.env.get("META_APP_ID"),
  };
  const clientId = map[provider];
  if (!clientId) {
    return c.json({ error: `${provider} is not configured for OAuth yet.` }, 400);
  }
  const url =
    `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&state=${encodeURIComponent(state)}` +
    `&scope=pages_manage_metadata,pages_read_engagement,instagram_manage_comments`;
  return c.json({ authorize_url: url });
});

// ---------- OAuth: provider redirect target ------------------------------
app.get(`${P}/oauth/:provider/callback`, async (c) => {
  const provider = c.req.param("provider");
  const code = c.req.query("code");
  const stateRaw = c.req.query("state") ?? "";
  let ws: string | null = null;
  let origin = "";
  try {
    const s = JSON.parse(atob(stateRaw));
    ws = s.ws;
    origin = s.origin;
  } catch {
    /* ignore malformed state */
  }
  const appId = Deno.env.get("META_APP_ID");
  const secret = Deno.env.get("META_APP_SECRET");
  const redirect = `${Deno.env.get("SUPABASE_URL")}/functions/v1/make-server-e8aa61da/oauth/${provider}/callback`;

  if (code && appId && secret && ws) {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirect)}&client_secret=${secret}&code=${code}`,
    );
    const tok = await tokenRes.json().catch(() => ({}));
    if (tok?.access_token) {
      await admin().from("integrations").upsert(
        { workspace_id: ws, provider, access_token: tok.access_token },
        { onConflict: "workspace_id,provider" },
      );
    }
  }
  return c.redirect(`${origin || ""}/app/settings?connected=${provider}`);
});

Deno.serve(app.fetch);
