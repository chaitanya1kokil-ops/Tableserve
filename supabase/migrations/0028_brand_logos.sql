-- Per-brand logos for multi-brand restaurants (e.g. Royal Paan + Punjaabi from
-- one QR). Map of brand name -> storage path; shown on the customer brand
-- picker next to each brand. Public info, safe on the world-readable row.
alter table public.restaurants
  add column if not exists brand_logos jsonb not null default '{}'::jsonb;
