# TrackLead OS — Go-Live Transition Plan

## Context

The app's UI, routing, theme, schema, and read path are built and Supabase is connected. But the platform is **not actually usable by real users yet**, for two reasons discovered during audit:

1. **The onboarding blocker (critical).** After signup nothing provisions a tenant. No `workspaces`/`profiles` row is created, and `role`/`workspace_id` are never written into the user's JWT `app_metadata`. Every RLS policy (`public.workspace_id()`, `public.is_super_admin()`) reads those claims, so a normal owner's reads return 0 rows and every insert/update fails the `with check` — silently, because the data layer swallows errors into empty states. Only the manually-patched super admin works today.
2. **~15 presentational buttons.** Across all roles, "create/save/send/connect/change" buttons have no handler. The only real write in the whole app is Pipeline drag-to-change-stage.

**Goal:** make every role fully live — signup provisions a workspace, all data saves/fetches from Supabase under RLS, and every button performs its action without errors. Decisions confirmed with the user: **real Paystack checkout** (server-initialized, test keys provided), **real social OAuth redirect flow**, and the **demo role-preview switcher is removed** from the production (Supabase-configured) experience.

---

## Part A — The onboarding engine (unblocks everything)

**New migration `supabase/migrations/0005_onboarding.sql`:** a `handle_new_user()` trigger function (SECURITY DEFINER) on `auth.users AFTER INSERT` that runs inside the signup transaction so the **first issued token already carries the claims**:

- If a pending invite exists in `workspace_members` (email match, `status='invited'`) → attach as **staff**: set `role='staff'`, `workspace_id` = that workspace; flip the member row to `status='active'`, `user_id=NEW.id`.
- Else → provision an **owner**: create a `workspaces` row (`owner_id=NEW.id`, `plan='starter'`, `billing_status='trialing'`), add an owner `workspace_members` row.
- Always: insert a `profiles` row, then `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', <role>, 'workspace_id', <ws>)` so the JWT carries both claims.

Also add a safe default so inserts can omit workspace_id: `alter table public.leads alter column workspace_id set default public.workspace_id();` (and same for other tenant tables), reinforcing the `with check`.

This makes the existing RLS in `0001_schema.sql` work as designed with zero policy changes.

---

## Part B — Data + auth layer (`src/lib/`)

- **`supabase.ts`**: add `del(table, match)` (DELETE); `resetPassword(email)` (GoTrue `/recover`); `paystackInit(planId)` and `serverCall(path, body)` helpers that call the edge server; **token auto-refresh** (GoTrue `/token?grant_type=refresh_token`, store `refresh_token`, refresh on 401 then retry). Add `currentWorkspaceId()` reading the session.
- **`auth.tsx`**: on signup success, since email confirmation may be on, route to `/verify`; on login, hydrate `workspace_id`+`role` from `app_metadata` (already present). Remove `previewAs` usage from production; keep only if `!supabaseConfigured`.
- **`useData.ts`**: add a `refetch()` return and a `useRealtime` variant (or polling) so the Kanban/Radar reflect writes immediately.

---

## Part C — Edge server endpoints (`supabase/functions/server/index.tsx`)

Extend the existing Hono server (prefix `/make-server-e8aa61da/…`), using `@supabase/supabase-js` with the **service role key** for privileged ops. Must be redeployed from the Make settings page after editing.

- `POST /billing/paystack/init` — initialize a Paystack transaction for the caller's workspace + selected plan; return `authorization_url`. (secret: `PAYSTACK_SECRET_KEY`)
- `POST /team/invite` — service-role `auth.admin.inviteUserByEmail` + upsert `workspace_members` (`status='invited'`). Sends the invite email via Supabase SMTP.
- `POST /admin/impersonate` — super-admin-guarded `auth.admin.generateLink` (magiclink) for "Login as".
- `POST /admin/tenant/:id` — super-admin suspend/plan-change writes to `workspaces`.
- `GET /oauth/:provider/callback` — exchange OAuth code → store token in `integrations`.
- Existing `billing-webhook` / `meta-webhook` functions already handle Paystack events and Meta ingestion.

Secrets to set (via `create_supabase_secret`): `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`.

---

## Part D — Complete button / action inventory (every interactive element)

Legend: ✅ already works · 🔧 needs wiring.

### Public — Landing (`routes/public/Landing.tsx`)
| Element | Action → destination |
|---|---|
| ✅ Nav Features/Pricing anchors | scroll to `#features` / `#pricing` |
| ✅ Log in / Start free / Get started (per plan) / Start free today | route to `/login` or `/signup` |
| 🔧 Pricing "Get started" | pass selected tier → `/signup?plan=<id>` (carries plan into onboarding/checkout) |
| ✅ Footer Terms / Privacy | route to `/terms` `/privacy` |

### Public — Auth (`routes/public/Auth.tsx`)
| Element | Action → destination |
|---|---|
| ✅ Login submit | `signIn` → route to role home (`/app`, `/staff`, `/admin`) |
| 🔧 Signup submit | `signUp` (+plan from query) → `/verify`; trigger provisions workspace |
| 🔧 "Send reset link" (forgot) | real `resetPassword(email)` → success notice |
| ✅ Forgot / Create account / Back to login links | route |
| 🔧 Demo role switcher | **remove when `supabaseConfigured`** (real auth only in production) |

### Owner — Pipeline (`routes/workspace/Pipeline.tsx`)
| Element | Action → destination |
|---|---|
| ✅ Kanban drag/drop | `update("leads",{stage})` (add `position` reorder) |
| ✅ Lead card click | open Lead Details drawer |
| 🔧 "Add lead" | open create-lead drawer → `insert("leads",{workspace_id,name,phone,source,stage:'new'})` → refetch |
| 🔧 "Generate a Smart Link" (empty state) | navigate to `/app/campaigns` |
| 🔧 "Save note" | `insert("lead_notes",{lead_id,workspace_id,body})` → clear + show in journey timeline (which becomes a real `lead_events`/`lead_notes` read) |
| ✅ "Open WhatsApp" | `wa.me/<phone>` new tab |
| 🔧 (owner) lead delete | new control → `del("leads",id)` (RLS already blocks staff) |

### Owner — Dashboard (`routes/workspace/Dashboard.tsx`)
| Element | Action |
|---|---|
| 🔧 ROAS / Cost-per-lead stats | compute from `leads` + `campaigns` (spend/leads) instead of `"—"` |

### Owner — Radar (`routes/workspace/Radar.tsx`)
| Element | Action |
|---|---|
| 🔧 "Convert to Lead" (per event) | `insert("leads",…)` from the social event → mark event converted (`update`) → refetch |

### Owner — Campaigns (`routes/workspace/Campaigns.tsx`)
| Element | Action |
|---|---|
| ✅ URL / Source / Campaign inputs | local link builder |
| 🔧 "Copy link" | also `insert("campaigns",{workspace_id,name,channel,url})` so it appears in the performance table |

### Owner — Widgets (`routes/workspace/Widgets.tsx`)
| Element | Action |
|---|---|
| ✅ vCard/Form tabs, name/phone inputs | live preview |
| 🔧 "Create vCard/form" | `insert("capture_widgets",{workspace_id,kind,config})` → return shareable URL/embed snippet |

### Owner — Settings (`routes/workspace/Settings.tsx`)
| Element | Action |
|---|---|
| ✅ Integrations/Team/Billing tabs | local switch |
| 🔧 "Connect" ×4 | redirect to real OAuth (`/oauth/<provider>/authorize`); on return store in `integrations`, button shows "Connected" (fix per-platform icons) |
| 🔧 "Send invite" | `POST /team/invite` → member row + email → refresh list |
| 🔧 "Change plan" | open plan modal → `POST /billing/paystack/init` → redirect to Paystack |
| 🔧 "Update payment method" | Paystack card-update via init flow |
| 🔧 Plan badge | read live from `subscriptions`/`workspaces` |

### Staff — Pipeline / Radar
Same components with `staff` flag: move leads ✅, add notes 🔧, Convert to Lead 🔧. No delete/billing/settings (enforced by RBAC + RLS).

### Super Admin (`routes/admin/Admin.tsx`)
| Element | Action |
|---|---|
| 🔧 Master Dashboard MRR/churn | compute from `subscriptions`/`billing_events` |
| 🔧 Tenant "Manage" | open drawer → suspend / change plan via `POST /admin/tenant/:id` |
| 🔧 User "Login as" | `POST /admin/impersonate` → open magic link session |
| 🔧 Plans "Save changes" | controlled inputs → `update("subscription_plans",…)` (drives live pricing page) |
| 🔧 Support tickets | add reply/resolve → `update("support_tickets",{status})` |

### App shell (`components/AppShell.tsx`)
| Element | Action |
|---|---|
| ✅ Logo / nav / sign out / mobile drawer | routing + session |
| 🔧 Notifications bell | dropdown reading recent `leads`/`social_events`/invites with unread count |

---

## Files to create / modify
- **New:** `supabase/migrations/0005_onboarding.sql` (trigger + defaults).
- **Modify:** `src/lib/supabase.ts`, `src/lib/auth.tsx`, `src/lib/useData.ts`.
- **Modify:** `supabase/functions/server/index.tsx` (privileged endpoints).
- **Modify:** every route file in `src/routes/**` to wire the 🔧 actions above; add a shared `LeadForm` + `PlanModal` in `src/components/`.
- Reuse existing `insert`/`update`/`select` (`src/lib/supabase.ts`), `Drawer`/`Button`/`Field` (`src/components/ui.tsx`), and `wa.me` pattern (`Pipeline.tsx`).

## Verification (end-to-end, live)
1. Apply `0005_onboarding.sql`; redeploy the edge server from Make settings.
2. **New owner:** sign up (fresh email) → verify → log in → confirm a workspace exists and JWT has `role`/`workspace_id` (decode token / check Network). Add a lead → it persists and reappears after refresh (proves RLS insert/select).
3. **Tenant isolation:** sign up a 2nd owner; confirm neither sees the other's leads.
4. **Staff:** invite from owner Settings → accept via email → confirm staff sees only that workspace, can move leads + add notes, cannot delete or see billing/settings.
5. **Billing:** "Change plan" → Paystack test checkout → webhook flips `workspaces.billing_status`; badge updates.
6. **OAuth:** "Connect" redirects to provider (completes once app approved); `integrations` row written.
7. **Super admin:** Plans "Save changes" updates the public pricing page; "Login as" opens a tenant session; "Manage" suspends a tenant.
8. Run `npx tsc --noEmit` and `npx vite build` — both green.
