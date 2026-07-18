-- Restaurants can link their Google review page; a "Reviews" button then shows
-- next to the restaurant name on the customer menu. Public info (world-readable
-- on active restaurants is fine — it's a link customers are meant to click).
alter table public.restaurants
  add column if not exists google_review_url text;
