-- TrackLead OS — elevate justusose5@gmail.com to Super Admin.
-- Run AFTER signing up with that email/password through the app's /signup page.
-- This confirms the email (so login works even if confirmations are on) and
-- sets the super_admin role claim that both the app RBAC and RLS read.

do $$
declare
  uid         uuid;
  admin_email text := 'justusose5@gmail.com';
  admin_name  text := 'Justus Ose';
begin
  select id into uid from auth.users where email = admin_email;
  if uid is null then
    raise exception 'No user %. Sign up via the app first, then re-run this.', admin_email;
  end if;

  update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data  = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || '{"role":"super_admin"}'::jsonb,
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                             || jsonb_build_object('full_name', admin_name),
        updated_at = now()
    where id = uid;

  insert into public.profiles (id, email, full_name, role)
  values (uid, admin_email, admin_name, 'super_admin')
  on conflict (id) do update
    set role = 'super_admin', full_name = excluded.full_name, email = excluded.email;
end $$;
