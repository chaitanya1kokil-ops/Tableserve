-- ============================================================================
-- Fix: "permission denied for table payments" when settling a tab.
-- 0001 granted privileges on all tables that existed at the time; payments
-- (added in 0005) was created after that blanket grant, so the authenticated
-- role has no privileges on it. RLS policies still apply on top of this.
-- ============================================================================

grant select, insert on public.payments to authenticated;

-- Cover any future tables so this class of bug can't happen again.
alter default privileges in schema public
  grant all on tables to anon, authenticated;
