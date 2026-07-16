-- Track whether the subscription is billed monthly or yearly (synced from the
-- Stripe price's recurring interval by the webhook). Used to show the current
-- cadence on the Subscription tab.
alter table public.restaurants add column if not exists billing_interval text;
