-- Subscription billing state, synced from Stripe by the /api/stripe-webhook
-- serverless function (which uses the service-role key, bypassing RLS).
--
-- subscription_status mirrors Stripe: trialing | active | past_due | canceled
-- | unpaid | incomplete. trial_ends_at / current_period_end come straight from
-- the Stripe subscription. These are read-only to the owner (updated only by
-- the webhook via service role).

alter table public.restaurants
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_subscription_id  text,
  add column if not exists subscription_status     text,
  add column if not exists trial_ends_at           timestamptz,
  add column if not exists current_period_end      timestamptz;

create index if not exists restaurants_stripe_customer_idx
  on public.restaurants (stripe_customer_id);
