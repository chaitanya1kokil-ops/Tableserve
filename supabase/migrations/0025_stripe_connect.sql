-- Stripe Connect: food trucks link their OWN Stripe account so diners pay them
-- directly (direct charges on the connected account). stripe_connect_ready
-- mirrors the account's charges_enabled flag, synced by /api/connect-status.
alter table public.restaurants
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_ready boolean not null default false;
