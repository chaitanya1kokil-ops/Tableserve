-- ============================================================================
-- Multi-brand menus: a restaurant can group categories under named brands
-- (e.g. "Royal Paan" and "Punjaabi Indian Cuisine" sharing one QR).
-- When 2+ brands exist, the customer menu shows a brand picker first.
-- Null brand = normal single-menu behaviour for every other restaurant.
-- ============================================================================

alter table public.menu_categories
  add column if not exists brand text;
