-- TrackLead OS — seed the Super Admin (Kalimb / project owner).
-- Run in the Supabase SQL editor AFTER 0001_schema.sql.
-- SECURITY: this file contains a plaintext password. Change it after first
-- login (Settings → password) and delete/rotate this file from source control.

do $$
declare
  uid         uuid;
  admin_email text := 'justusose5@gmail.com';
  admin_pw    text := 'Osebhuohien@1.';
  admin_name  text := 'Justus Ose';
begin
  select id into uid from auth.users where email = admin_email;

  if uid is null then
    uid := gen_random_uuid();

    -- Create the auth user with a bcrypt password and super_admin claim.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      admin_email, crypt(admin_pw, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"super_admin"}'::jsonb,
      jsonb_build_object('full_name', admin_name),
      now(), now()
    );

    -- Email identity so password sign-in works.
    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      uid::text, uid,
      jsonb_build_object('sub', uid::text, 'email', admin_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  else
    -- User already exists — ensure the role claim and password are set.
    update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
            || '{"role":"super_admin"}'::jsonb,
          encrypted_password = crypt(admin_pw, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      where id = uid;
  end if;

  -- Mirror into the profiles table with the super_admin role.
  insert into public.profiles (id, email, full_name, role)
  values (uid, admin_email, admin_name, 'super_admin')
  on conflict (id) do update
    set role = 'super_admin', full_name = excluded.full_name, email = excluded.email;
end $$;
