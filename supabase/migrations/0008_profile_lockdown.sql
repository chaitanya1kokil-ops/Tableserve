-- ============================================================================
-- Security: prevent privilege escalation via profiles.
-- Users could previously update/insert their own profile row with ANY column,
-- including role — letting a client (or an anonymous session) grant itself
-- platform_admin. Column-level grants close that: role is now writable only
-- via the SQL editor (postgres role). The signup trigger is SECURITY DEFINER,
-- so it still creates profiles normally.
-- ============================================================================

revoke insert, update on table public.profiles from anon, authenticated;

grant insert (id, email, full_name) on public.profiles to authenticated;
grant update (email, full_name, restaurant_id) on public.profiles to authenticated;
