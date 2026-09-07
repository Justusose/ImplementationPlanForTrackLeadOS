// Supabase Edge Function — Paystack / Flutterwave billing webhook.
// Verifies the signature, logs the event to billing_events, and updates the
// workspace subscription state (recurring Naira billing).
//
// Deploy: supabase functions deploy billing-webhook --no-verify-jwt
// Secrets: PAYSTACK_SECRET_KEY, FLW_SECRET_HASH, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function verifyPaystack(raw: string, signature: string | null): Promise<boolean> {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key || !signature) return false;
  const hash = createHmac("sha512", key).update(raw).digest("hex");
  return hash === signature;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const paystackSig = req.headers.get("x-paystack-signature");
  const flwSig = req.headers.get("verif-hash");

  let provider = "unknown";
  let ok = false;
  if (paystackSig) {
    provider = "paystack";
    ok = await verifyPaystack(raw, paystackSig);
  } else if (flwSig) {
    provider = "flutterwave";
    ok = flwSig === Deno.env.get("FLW_SECRET_HASH");
  }
  if (!ok) return new Response("Invalid signature", { status: 401 });

  const payload = JSON.parse(raw);
  const event: string = payload.event ?? payload["event.type"] ?? "";
  const data = payload.data ?? {};
  const workspaceId = data.metadata?.workspace_id ?? data.meta?.workspace_id ?? null;

  const success = /success|charge.completed|subscription.create/i.test(event);
  const failed = /failed|charge.failed/i.test(event);

  // Idempotent log of every webhook (unique on provider reference upstream).
  await admin.from("billing_events").insert({
    workspace_id: workspaceId,
    provider,
    status: success ? "success" : failed ? "failed" : "info",
    amount: Math.round((data.amount ?? 0) / (provider === "paystack" ? 100 : 1)),
    raw: payload,
  });

  // Update subscription state on the workspace.
  if (workspaceId && (success || failed)) {
    await admin
      .from("workspaces")
      .update({ billing_status: success ? "active" : "past_due" })
      .eq("id", workspaceId);
  }

  return new Response("ok", { status: 200 });
});
