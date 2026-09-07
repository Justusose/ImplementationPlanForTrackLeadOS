-- TrackLead OS — remove the hand-seeded Super Admin so it can be recreated
-- cleanly through Supabase Auth (which guarantees a loginable credential).
-- Run this, THEN sign up via the app, THEN run 0004_elevate_super_admin.sql.

delete from auth.users where email = 'justusose5@gmail.com';
-- public.profiles cascades via its FK (on delete cascade).
