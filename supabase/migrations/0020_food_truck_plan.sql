-- Add a dedicated 'food_truck' subscription tier ($79 flat) so trucks pick a
-- single plan at onboarding instead of the three restaurant tiers.
--
-- Only the plan CHECK constraint needs widening:
--   * enforce_table_limit() already short-circuits for business_type='food_truck'
--   * loyalty_join() already grants rewards to food trucks by business_type
-- so no function changes are required for trucks on this plan.

alter table public.restaurants
  drop constraint restaurants_plan_check,
  add constraint restaurants_plan_check
    check (plan = any (array['trial', 'starter', 'pro', 'premium', 'food_truck']));
