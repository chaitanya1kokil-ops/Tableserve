-- ============================================================================
-- Plan sync + feature enforcement
-- Renames the tiers to Starter / Pro / Premium ($59/$79/$99) and enforces the
-- gates server-side so they can't be bypassed via the API:
--   * table count      -> Starter 10, Pro 40, Premium/Trial unlimited
--   * loyalty program   -> Pro & Premium (+ Trial, + food trucks)
-- Keep these limits in sync with src/lib/constants.js (PLANS).
-- ============================================================================

-- Old tiers were trial/starter/growth/pro. Map any stragglers, then widen the
-- allowed set. (All live restaurants are on 'trial', so this is a no-op in
-- practice, but safe.)
update public.restaurants set plan = 'pro'     where plan = 'growth';
update public.restaurants set plan = 'premium' where plan = 'pro' and plan not in ('pro'); -- noop guard

alter table public.restaurants drop constraint if exists restaurants_plan_check;
alter table public.restaurants add constraint restaurants_plan_check
  check (plan in ('trial', 'starter', 'pro', 'premium'));

-- ---- table limit -----------------------------------------------------------
create or replace function public.plan_table_limit(p_plan text)
returns int language sql immutable as $$
  select case p_plan
    when 'starter' then 10
    when 'pro' then 40
    else null  -- trial, premium => unlimited
  end;
$$;

create or replace function public.enforce_table_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan  text;
  v_biz   text;
  v_limit int;
  v_count int;
begin
  select plan, business_type into v_plan, v_biz
  from public.restaurants where id = new.restaurant_id;

  if v_biz = 'food_truck' then return new; end if; -- trucks have no tables

  v_limit := public.plan_table_limit(coalesce(v_plan, 'trial'));
  if v_limit is null then return new; end if;

  select count(*) into v_count from public.tables where restaurant_id = new.restaurant_id;
  if v_count >= v_limit then
    raise exception 'Your % plan allows up to % tables. Upgrade to add more.',
      initcap(coalesce(v_plan, 'trial')), v_limit;
  end if;
  return new;
end;
$$;

drop trigger if exists tables_enforce_limit on public.tables;
create trigger tables_enforce_limit
  before insert on public.tables
  for each row execute function public.enforce_table_limit();

-- ---- loyalty gate ----------------------------------------------------------
-- Recreate loyalty_join with a plan check up front (Pro/Premium/Trial, or any
-- food truck). Everything else is unchanged from 0014.
create or replace function public.loyalty_join(
  p_restaurant uuid, p_name text, p_email text, p_consent boolean
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v public.loyalty_members%rowtype;
  v_email text := lower(trim(p_email));
  v_plan  text;
  v_biz   text;
begin
  select plan, business_type into v_plan, v_biz
  from public.restaurants
  where id = p_restaurant and status = 'active' and loyalty_brand is not null;
  if not found then
    raise exception 'Rewards program is not available.';
  end if;
  if not (coalesce(v_biz, '') = 'food_truck' or coalesce(v_plan, 'trial') in ('trial', 'pro', 'premium')) then
    raise exception 'Rewards are not available on this plan.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address.';
  end if;
  if coalesce(p_consent, false) is not true then
    raise exception 'Consent is required to join.';
  end if;
  if (
    select count(*) from public.loyalty_members
    where created_by = auth.uid() and created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'Too many signups from this device — please try again later.';
  end if;

  insert into public.loyalty_members (restaurant_id, email, name, consented_at, created_by)
  values (p_restaurant, v_email, nullif(trim(p_name), ''), now(), auth.uid())
  on conflict (restaurant_id, lower(email)) do update
    set name = coalesce(public.loyalty_members.name, excluded.name),
        consented_at = coalesce(public.loyalty_members.consented_at, now())
  returning * into v;

  return public.loyalty_summary(v);
end;
$$;
