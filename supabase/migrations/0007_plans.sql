-- ============================================================================
-- Subscription plans (platform admin)
-- Each restaurant carries a plan; the platform owner manages it from /admin.
-- New signups start on a 14-day trial.
-- ============================================================================

alter table public.restaurants
  add column if not exists plan text not null default 'trial'
    check (plan in ('trial', 'starter', 'growth', 'pro')),
  add column if not exists trial_ends_at timestamptz default (now() + interval '14 days');
