-- TrackLead OS — profile/KYC fields, plan limits, and two-way support threads.

-- ---------- workspace profile / KYC --------------------------------------
alter table public.workspaces add column if not exists phone       text;
alter table public.workspaces add column if not exists address     text;
alter table public.workspaces add column if not exists city        text;
alter table public.workspaces add column if not exists country     text;
alter table public.workspaces add column if not exists industry    text;
alter table public.workspaces add column if not exists reg_number  text;

alter table public.profiles add column if not exists phone text;

-- Owners must be able to update their own workspace's profile details.
drop policy if exists workspace_owner_update on public.workspaces;
create policy workspace_owner_update on public.workspaces
  for update
  using (id = public.workspace_id() or public.is_super_admin())
  with check (id = public.workspace_id() or public.is_super_admin());

-- Users can update their own profile row.
drop policy if exists profile_self_update on public.profiles;
create policy profile_self_update on public.profiles
  for update using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

-- ---------- plan limits ---------------------------------------------------
alter table public.subscription_plans add column if not exists seat_limit integer;
alter table public.subscription_plans add column if not exists tagline    text;

-- ---------- support threads ----------------------------------------------
-- support_tickets already exists; add a messages table for the conversation.
create table if not exists public.support_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.support_tickets(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  sender_role  text not null,
  sender_id    uuid references auth.users(id),
  body         text not null,
  created_at   timestamptz default now()
);

alter table public.support_messages enable row level security;

drop policy if exists support_messages_rw on public.support_messages;
create policy support_messages_rw on public.support_messages
  for all
  using (public.is_super_admin() or workspace_id = public.workspace_id())
  with check (public.is_super_admin() or workspace_id = public.workspace_id());

-- Let staff (not just owners) open and read their workspace's tickets.
-- (support_rw in 0001 already covers workspace_id = public.workspace_id().)

alter publication supabase_realtime add table public.support_messages;
