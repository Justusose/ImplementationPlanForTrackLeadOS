-- TrackLead OS — schema + multi-tenant Row Level Security.
-- Apply via: supabase db push  (or paste into the Supabase SQL editor).
-- Every tenant table carries workspace_id and an RLS policy tying rows to the
-- caller's workspace_id claim. Super Admins bypass tenant RLS via a role claim.

-- ---------- helpers -------------------------------------------------------
create extension if not exists "pgcrypto";

-- Reads the caller's workspace_id from the JWT app_metadata claim.
create or replace function public.workspace_id() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json
    -> 'app_metadata' ->> 'workspace_id', '')::uuid;
$$;

-- Reads the caller's role from the JWT app_metadata claim.
create or replace function public.role_claim() returns text
language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::json
    -> 'app_metadata' ->> 'role', 'anon');
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable as $$ select public.role_claim() = 'super_admin'; $$;

-- ---------- global tables (super-admin scoped) ----------------------------
create table if not exists public.subscription_plans (
  id           text primary key,
  name         text not null,
  price_ngn    integer not null,
  tagline      text,
  features     jsonb not null default '[]',
  lead_limit   integer,
  highlighted  boolean default false,
  created_at   timestamptz default now()
);

create table if not exists public.workspaces (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  owner_id       uuid references auth.users(id),
  plan           text references public.subscription_plans(id) default 'starter',
  billing_status text not null default 'trialing',
  created_at     timestamptz default now()
);

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  role         text not null default 'owner',
  created_at   timestamptz default now()
);

create table if not exists public.workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid references auth.users(id),
  email        text not null,
  role         text not null default 'staff',
  status       text not null default 'invited',
  created_at   timestamptz default now()
);

-- ---------- tenant tables -------------------------------------------------
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  phone        text,
  stage        text not null default 'new',
  source       text,
  campaign     text,
  value        integer,
  position     integer default 0,
  assigned_to  uuid references auth.users(id),
  created_at   timestamptz default now()
);

create table if not exists public.lead_notes (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id      uuid not null references public.leads(id) on delete cascade,
  author_id    uuid references auth.users(id),
  body         text not null,
  created_at   timestamptz default now()
);

create table if not exists public.lead_events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id      uuid references public.leads(id) on delete cascade,
  kind         text not null,
  detail       text,
  created_at   timestamptz default now()
);

create table if not exists public.campaigns (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  channel      text,
  url          text,
  clicks       integer default 0,
  leads        integer default 0,
  spend        integer default 0,
  created_at   timestamptz default now()
);

create table if not exists public.capture_widgets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind         text not null default 'vcard',
  config       jsonb not null default '{}',
  created_at   timestamptz default now()
);

create table if not exists public.integrations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  provider      text not null,
  access_token  text,
  meta          jsonb default '{}',
  connected_at  timestamptz default now()
);

create table if not exists public.social_events (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  platform      text not null,
  type          text not null,
  author        text,
  text          text,
  external_id   text,
  created_at    timestamptz default now()
);

create table if not exists public.web_visitors (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  page          text,
  city          text,
  created_at    timestamptz default now()
);

create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  plan          text references public.subscription_plans(id),
  status        text not null default 'active',
  provider      text,
  renews_at     timestamptz,
  created_at    timestamptz default now()
);

create table if not exists public.billing_events (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete set null,
  provider      text not null,
  status        text not null,
  amount        integer,
  raw           jsonb,
  created_at    timestamptz default now()
);

create table if not exists public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces(id) on delete set null,
  subject       text not null,
  body          text,
  status        text not null default 'open',
  created_at    timestamptz default now()
);

-- ---------- enable RLS ----------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','workspace_members','leads','lead_notes','lead_events',
    'campaigns','capture_widgets','integrations','social_events','web_visitors',
    'subscriptions','billing_events','support_tickets','subscription_plans','profiles'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- ---------- tenant isolation policies -------------------------------------
-- Pattern applied to every workspace-scoped table.
do $$
declare t text;
begin
  foreach t in array array[
    'leads','lead_notes','lead_events','campaigns','capture_widgets',
    'integrations','social_events','web_visitors','subscriptions','workspace_members'
  ] loop
    -- Read/write restricted to the caller's workspace; super admins see all.
    execute format($f$
      create policy tenant_all on public.%I
        for all
        using (workspace_id = public.workspace_id() or public.is_super_admin())
        with check (workspace_id = public.workspace_id() or public.is_super_admin());
    $f$, t);
  end loop;
end $$;

-- Staff cannot DELETE leads (owners and super admins can).
create policy leads_no_delete_for_staff on public.leads
  for delete using (public.role_claim() in ('owner','super_admin') and
                    (workspace_id = public.workspace_id() or public.is_super_admin()));

-- workspaces: owner sees own; super admin sees all.
create policy workspace_read on public.workspaces
  for select using (id = public.workspace_id() or public.is_super_admin());
create policy workspace_write on public.workspaces
  for update using (owner_id = auth.uid() or public.is_super_admin());

-- profiles: user sees self; super admin sees all.
create policy profile_self on public.profiles
  for select using (id = auth.uid() or public.is_super_admin());

-- subscription_plans: public read (pricing page); super admin write.
create policy plans_public_read on public.subscription_plans
  for select using (true);
create policy plans_admin_write on public.subscription_plans
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- billing_events & support_tickets: super admin manage; owner reads own.
create policy billing_admin on public.billing_events
  for all using (public.is_super_admin() or workspace_id = public.workspace_id())
  with check (public.is_super_admin());
create policy support_rw on public.support_tickets
  for all using (public.is_super_admin() or workspace_id = public.workspace_id())
  with check (public.is_super_admin() or workspace_id = public.workspace_id());

-- ---------- realtime ------------------------------------------------------
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.social_events;
alter publication supabase_realtime add table public.web_visitors;

-- ---------- seed plans ----------------------------------------------------
insert into public.subscription_plans (id, name, price_ngn, tagline, features, highlighted) values
  ('starter','Starter',5500,'For solo founders capturing their first leads.',
   '["1 workspace","WhatsApp CRM pipeline","500 leads / mo","1 Smart Link","Email support"]', false),
  ('growth','Growth',15500,'For growing teams closing more deals.',
   '["Everything in Starter","Social Radar (Meta)","5 team seats","Unlimited leads","Web visitor tracking","Campaign attribution"]', true),
  ('pro','Pro',35000,'For established businesses scaling acquisition.',
   '["Everything in Growth","Unlimited seats","All integrations","Priority support","Custom capture widgets","Advanced ROI analytics"]', false)
on conflict (id) do nothing;
