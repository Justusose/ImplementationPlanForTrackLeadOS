# TrackLead OS — Supabase backend

This folder contains the database schema (with strict multi-tenant RLS) and the
Edge Functions for Social Radar and billing. Apply it once Supabase is connected.

## 1. Connect Supabase
In Figma Make, use the **Connect Supabase** flow (or set the env vars below), then
add them to the frontend as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
(see `.env.example`). Until this is done the app runs in **preview mode** with
premium empty states (no demo data).

## 2. Apply the schema
```bash
supabase db push          # applies migrations/0001_schema.sql
# — or paste the SQL into the Supabase SQL editor.
```
This creates all tables, enables RLS on every one, applies the tenant-isolation
policy pattern (`workspace_id = auth.workspace_id()`), restricts staff from
deleting leads, exposes `subscription_plans` for the public pricing page, adds
`leads` / `social_events` / `web_visitors` to Realtime, and seeds the 3 Naira
tiers.

## 3. Role claims (RBAC)
Roles are read from the JWT `app_metadata` claim (`role`, `workspace_id`). Set
them with the service role after creating a user, e.g.:
```sql
-- make Justus Ose the Super Admin (Phase 1 directive)
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"super_admin"}'
where email = 'justusose5@gmail.com';
```
Create the seed Super Admin via the Auth dashboard (email `justusose5@gmail.com`)
and set a strong password there — never commit it to source.

Owners/staff get `role` + `workspace_id` set on signup / invite acceptance
(handle in an `on_auth_user_created` trigger or an Edge Function).

## 4. Deploy Edge Functions
```bash
supabase functions deploy meta-webhook   --no-verify-jwt
supabase functions deploy billing-webhook --no-verify-jwt
```
Secrets:
```bash
supabase secrets set META_VERIFY_TOKEN=... \
  PAYSTACK_SECRET_KEY=... FLW_SECRET_HASH=...
```
- **meta-webhook** — set this URL as the Meta app webhook callback; it answers the
  verification handshake and ingests comments/DMs/mentions into `social_events`.
- **billing-webhook** — set as the Paystack (and/or Flutterwave) webhook URL; it
  verifies signatures, logs to `billing_events`, and updates `workspaces.billing_status`.

## Go-live checklist
See `plans/i-need-you-to-peaceful-pelican.md` — Meta app review, Paystack live
keys, RLS verification across multiple workspaces, auth flows, legal pages, and
the mobile 20% type-reduction pass.
