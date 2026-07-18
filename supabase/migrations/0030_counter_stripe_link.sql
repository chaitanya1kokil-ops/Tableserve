-- Optional payment link for a counter/register QR. If set, the customer is
-- redirected here to pay after placing their takeout order. It's a public
-- Stripe payment URL (safe on the world-readable tables row).
alter table public.tables
  add column if not exists stripe_link text;
