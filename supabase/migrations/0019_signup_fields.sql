-- ============================================================================
-- Richer signup: business website + owner contact details.
-- profiles is column-locked (0008/0010), so new writable columns need grants.
-- ============================================================================

alter table public.restaurants add column if not exists website text;

alter table public.profiles
  add column if not exists phone text,
  add column if not exists title text; -- owner's role, e.g. Owner / Manager

grant insert (id, email, full_name, restaurant_id, phone, title) on public.profiles to authenticated;
grant update (email, full_name, restaurant_id, phone, title, id) on public.profiles to authenticated;
