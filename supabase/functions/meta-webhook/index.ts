// Supabase Edge Function — Meta Graph API webhook (Social Radar).
// Handles the GET verification handshake and POST engagement events
// (comments, DMs, mentions), inserting them into public.social_events.
//
// Deploy: supabase functions deploy meta-webhook --no-verify-jwt
// Secrets: META_VERIFY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN")!;
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1) Verification handshake from Meta.
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // 2) Incoming engagement events.
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const rows: Record<string, unknown>[] = [];

    for (const entry of body.entry ?? []) {
      // Resolve which workspace this Meta page belongs to.
      const pageId = entry.id;
      const { data: integ } = await admin
        .from("integrations")
        .select("workspace_id")
        .eq("provider", "meta")
        .eq("meta->>page_id", pageId)
        .maybeSingle();
      if (!integ) continue;

      for (const change of entry.changes ?? []) {
        const v = change.value ?? {};
        rows.push({
          workspace_id: integ.workspace_id,
          platform: v.platform ?? "facebook",
          type: change.field?.includes("mention") ? "mention" : "comment",
          author: v.from?.name ?? v.from?.id ?? "Unknown",
          text: v.message ?? v.text ?? "",
          external_id: v.id ?? v.comment_id ?? null,
        });
      }
      for (const m of entry.messaging ?? []) {
        rows.push({
          workspace_id: integ.workspace_id,
          platform: "instagram",
          type: "dm",
          author: m.sender?.id ?? "Unknown",
          text: m.message?.text ?? "",
          external_id: m.message?.mid ?? null,
        });
      }
    }

    if (rows.length) await admin.from("social_events").insert(rows);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});
