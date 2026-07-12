-- ============================================================================
-- Fix: onboarding failed with "permission denied for table profiles".
-- Onboarding upserts profiles (id, email, restaurant_id); 0008's column-level
-- insert grant omitted restaurant_id, and an upsert needs INSERT permission on
-- every column it references. role remains excluded (the escalation lockdown).
-- ============================================================================

grant insert (id, email, full_name, restaurant_id) on public.profiles to authenticated;

-- Follow-up: PostgREST upserts also SET every payload column in the
-- ON CONFLICT UPDATE branch, including the primary key itself. The profile
-- row always exists (signup trigger), so the update branch runs and needs
-- UPDATE on id too. RLS still pins id to auth.uid(); role stays locked.
grant update (id) on public.profiles to authenticated;
