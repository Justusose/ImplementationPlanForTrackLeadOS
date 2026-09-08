// TrackLead OS — privileged edge server (Hono).
// Runs with the service-role key so it can perform tenant-safe writes that the
// browser (anon + RLS) cannot: Paystack checkout, team invites, super-admin
// impersonation/tenant management, and public capture-form ingestion.
//
// IMPORTANT: after editing this file, redeploy the edge function from the
// Make settings page — code changes are NOT live until you redeploy.
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();
const P = "/make-server-e8aa61da";

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Resolve the calling user + JWT claims from the Authorization header. */
async function caller(c: any) {
  const auth = c.req.header("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) return null;
  const meta = (data.user.app_metadata ?? {}) as Record<string, unknown>;
  return {
    user: data.user,
    role: (meta.role as string) ?? null,
    workspace_id: (meta.workspace_id as string) ?? null,
  };
}

app.get(`${P}/health`, (c) => c.json({ status: "ok" }));

// ---------------------------------------------------------------- billing ----
app.post(`${P}/billing/paystack/init`, async (c) => {
  const who = await caller(c);
  if (!who) return c.json({ error: "Not authenticated." }, 401);
  if (!PAYSTACK_SECRET) {
    return c.json({ error: "Paystack is not configured. Add PAYSTACK_SECRET_KEY." }, 400);
  }
  const body = await c.req.json().catch(() => ({}));
  const planId = body.plan ?? "starter";

  const db = admin();
  const { data: plan } = await db
    .from("subscription_plans")
    .select("id,name,price_ngn")
    .eq("id", planId)
    .maybeSingle();
  const price = plan?.price_ngn ?? 5500;

  const origin = c.req.header("Origin") ?? SUPABASE_URL;
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: who.user.email,
      amount: Math.round(price * 100), // kobo
      callback_url: `${origin}/app/settings`,
      metadata: { workspace_id: who.workspace_id, plan: planId },
    }),
  });
  const pay = await res.json().catch(() => ({}));
  if (!res.ok || !pay.status) {
    return c.json({ error: pay.message ?? "Could not start checkout." }, 400);
  }
  // Reflect the selected plan immediately; the webhook confirms payment.
  if (who.workspace_id) {
    await db.from("workspaces").update({ plan: planId }).eq("id", who.workspace_id);
  }
  return c.json({ authorization_url: pay.data.authorization_url });
});

// ------------------------------------------------------------------- team ----
app.post(`${P}/team/invite`, async (c) => {
  const who = await caller(c);
  if (!who || !who.workspace_id) return c.json({ error: "Not authenticated." }, 401);
  if (who.role !== "owner" && who.role !== "super_admin") {
    return c.json({ error: "Only owners can invite team members." }, 403);
  }
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return c.json({ error: "Email is required." }, 400);

  const db = admin();
  await db.from("workspace_members").upsert(
    { workspace_id: who.workspace_id, email, role: "staff", status: "invited" },
    { onConflict: "workspace_id,email" },
  );
  const { error } = await db.auth.admin.inviteUserByEmail(email);
  if (error && !String(error.message).includes("already been registered")) {
    return c.json({ error: error.message }, 400);
  }
  return c.json({ ok: true });
});

// ------------------------------------------------------------------ admin ----
app.post(`${P}/admin/impersonate`, async (c) => {
  const who = await caller(c);
  if (!who || who.role !== "super_admin") return c.json({ error: "Forbidden." }, 403);
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  if (!email) return c.json({ error: "Email is required." }, 400);
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ action_link: data.properties?.action_link });
});

app.post(`${P}/admin/tenant/:id`, async (c) => {
  const who = await caller(c);
  if (!who || who.role !== "super_admin") return c.json({ error: "Forbidden." }, 403);
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.plan === "string") patch.plan = body.plan;
  if (typeof body.billing_status === "string") patch.billing_status = body.billing_status;
  if (Object.keys(patch).length === 0) return c.json({ error: "Nothing to update." }, 400);
  const { error } = await admin().from("workspaces").update(patch).eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- capture ----
// Public form submission: no auth. Service role inserts the lead into the
// widget's workspace (anon can't satisfy the tenant RLS check).
app.post(`${P}/capture/:widgetId`, async (c) => {
  const widgetId = c.req.param("widgetId");
  const body = await c.req.json().catch(() => ({}));
  const db = admin();
  const { data: widget } = await db
    .from("capture_widgets")
    .select("id,workspace_id,config")
    .eq("id", widgetId)
    .maybeSingle();
  if (!widget) return c.json({ error: "Widget not found." }, 404);

  const fields = (body.fields ?? {}) as Record<string, string>;
  const name = String(body.name ?? fields.name ?? fields.full_name ?? "New lead").trim();
  const phone = String(body.phone ?? fields.phone ?? fields.whatsapp ?? "").trim();

  const { data: lead, error } = await db
    .from("leads")
    .insert({
      workspace_id: widget.workspace_id,
      name: name || "New lead",
      phone: phone || null,
      source: "Capture widget",
      stage: "new",
    })
    .select("id")
    .single();
  if (error) return c.json({ error: error.message }, 400);

  // Preserve any extra form answers as the first note on the lead.
  const extras = Object.entries(fields).filter(
    ([k, v]) => v && !["name", "full_name", "phone", "whatsapp"].includes(k),
  );
  if (lead && extras.length) {
    await db.from("lead_notes").insert({
      workspace_id: widget.workspace_id,
      lead_id: lead.id,
      body: extras.map(([k, v]) => `${k}: ${v}`).join("\n"),
    });
  }
  return c.json({ ok: true });
});

Deno.serve(app.fetch);
