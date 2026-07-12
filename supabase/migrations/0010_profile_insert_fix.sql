-- ============================================================================
-- Fix: onboarding failed with "permission denied for table profiles".
-- Onboarding upserts profiles (id, email, restaurant_id); 0008's column-level
-- insert grant omitted restaurant_id, and an upsert needs INSERT permission on
-- every column it references. role remains excluded (the escalation lockdown).
-- ============================================================================

grant insert (id, email, full_name, restaurant_id) on public.profiles to authenticated;
