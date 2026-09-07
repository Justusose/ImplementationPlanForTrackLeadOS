-- TrackLead OS — onboarding engine.
-- Runs inside the signup transaction so the FIRST issued JWT already carries the
-- role + workspace_id claims that every RLS policy in 0001_schema.sql reads.
-- Without this, a new owner's reads return 0 rows and every write fails the
-- `with check` — silently. This unblocks the entire live experience.

-- ---------- provisioning trigger -----------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite      public.workspace_members%rowtype;
  ws_id       uuid;
  user_role   text;
  display     text := coalesce(new.raw_user_meta_data ->> 'full_name',
                               split_part(new.email, '@', 1));
begin
  -- 1) Pending staff invite? Attach to the existing workspace as staff.
  select * into invite
  from public.workspace_members
  where lower(email) = lower(new.email)
    and status = 'invited'
  order by created_at asc
  limit 1;

  if found then
    ws_id     := invite.workspace_id;
    user_role := coalesce(invite.role, 'staff');
    update public.workspace_members
      set user_id = new.id, status = 'active'
      where id = invite.id;
  else
    -- 2) Brand-new owner: provision a fresh workspace.
    user_role := 'owner';
    insert into public.workspaces (name, owner_id, plan, billing_status)
    values (display || '''s workspace', new.id,
            coalesce(new.raw_user_meta_data ->> 'plan', 'starter'), 'trialing')
    returning id into ws_id;

    insert into public.workspace_members (workspace_id, user_id, email, role, status)
    values (ws_id, new.id, new.email, 'owner', 'active');
  end if;

  -- 3) Profile row (mirrors the auth user for admin listing / joins).
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, display, user_role)
  on conflict (id) do update
    set email = excluded.email, full_name = excluded.full_name, role = excluded.role;

  -- 4) Stamp the JWT claims so RLS resolves for this user immediately.
  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', user_role, 'workspace_id', ws_id)
    where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- convenience defaults -----------------------------------------
-- Let inserts omit workspace_id; it defaults to the caller's claim and the RLS
-- `with check` still guarantees isolation.
do $$
declare t text;
begin
  foreach t in array array[
    'leads','lead_notes','lead_events','campaigns','capture_widgets',
    'integrations','social_events','web_visitors'
  ] loop
    execute format(
      'alter table public.%I alter column workspace_id set default public.workspace_id();', t);
  end loop;
end $$;

-- Capture widgets are meant to be shared publicly (vCards / embedded forms),
-- so anyone with the link may read a single widget's config.
drop policy if exists widgets_public_read on public.capture_widgets;
create policy widgets_public_read on public.capture_widgets
  for select using (true);

-- Unique keys backing the edge server's idempotent upserts.
create unique index if not exists workspace_members_ws_email_key
  on public.workspace_members (workspace_id, email);
create unique index if not exists integrations_ws_provider_key
  on public.integrations (workspace_id, provider);

-- profiles: let an owner read their own workspace members' profiles (team list).
drop policy if exists profile_workspace_read on public.profiles;
create policy profile_workspace_read on public.profiles
  for select using (
    id = auth.uid()
    or public.is_super_admin()
    or id in (select user_id from public.workspace_members
              where workspace_id = public.workspace_id())
  );
