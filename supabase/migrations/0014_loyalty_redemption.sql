-- ============================================================================
-- Loyalty round 2: counter-ready redemption + abuse guards
-- - loyalty_redemptions: audit ledger of every freebie (who, what, how much).
-- - redeem_reward(): atomic redemption with an over-redeem guard (fixes the
--   two-staff race).
-- - settle_tab(): optional p_reward comps a specific item off the bill at
--   payment time and records the redemption in the same transaction.
-- - loyalty_join(): rate-limited (3 joins/hour per session) + records creator.
-- ============================================================================

create table if not exists public.loyalty_redemptions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  member_id     uuid references public.loyalty_members (id) on delete set null,
  order_item_id uuid references public.order_items (id) on delete set null,
  amount        numeric(10, 2) not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.loyalty_redemptions enable row level security;

create policy "redemptions: staff read" on public.loyalty_redemptions
  for select using (restaurant_id = public.current_restaurant_id() or public.is_platform_admin());
create policy "redemptions: staff insert" on public.loyalty_redemptions
  for insert with check (restaurant_id = public.current_restaurant_id() or public.is_platform_admin());

alter table public.loyalty_members
  add column if not exists created_by uuid;

-- Atomic manual redemption (Loyalty page). The WHERE clause is the race
-- guard: it only succeeds while a reward is genuinely available.
create or replace function public.redeem_reward(p_member uuid)
returns json
language plpgsql security invoker set search_path = public as $$
declare
  v public.loyalty_members%rowtype;
begin
  update public.loyalty_members
  set rewards_redeemed = rewards_redeemed + 1
  where id = p_member
    and restaurant_id = public.current_restaurant_id()
    and (visits / 10) - rewards_redeemed > 0
  returning * into v;

  if not found then
    raise exception 'No reward available to redeem.';
  end if;

  insert into public.loyalty_redemptions (restaurant_id, member_id, amount)
  values (v.restaurant_id, v.id, 0);

  return public.loyalty_summary(v);
end;
$$;

grant execute on function public.redeem_reward(uuid) to authenticated;

-- Join with rate limiting; consent remains mandatory (server-enforced).
create or replace function public.loyalty_join(
  p_restaurant uuid, p_name text, p_email text, p_consent boolean
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v public.loyalty_members%rowtype;
  v_email text := lower(trim(p_email));
begin
  if not exists (
    select 1 from public.restaurants r
    where r.id = p_restaurant and r.status = 'active' and r.loyalty_brand is not null
  ) then
    raise exception 'Rewards program is not available.';
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

-- settle_tab with optional reward comp: p_reward = {member_id, order_item_id}.
-- The comped item's line_total comes off the amount due, the redemption is
-- recorded, and the member's counter increments atomically — all or nothing.
drop function if exists public.settle_tab(uuid, uuid[], jsonb);

create or replace function public.settle_tab(
  p_table_id  uuid,
  p_order_ids uuid[],
  p_payments  jsonb,
  p_reward    jsonb default null
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_rid           uuid := public.current_restaurant_id();
  v_due           numeric(10, 2);
  v_matched       int;
  v_paid          numeric(10, 2) := 0;
  v_pay           jsonb;
  v_member        record;
  v_min_spend     numeric(10, 2);
  v_comp          numeric(10, 2) := 0;
  v_reward_member uuid;
  v_reward_item   uuid;
  v_item          public.order_items%rowtype;
begin
  if v_rid is null then
    raise exception 'Not authorized';
  end if;
  if p_order_ids is null or array_length(p_order_ids, 1) is null then
    raise exception 'No orders to settle';
  end if;
  if p_payments is null or jsonb_array_length(p_payments) = 0 then
    raise exception 'No payments provided';
  end if;

  select coalesce(sum(total), 0), count(*)
  into v_due, v_matched
  from public.orders
  where id = any (p_order_ids)
    and restaurant_id = v_rid
    and status <> 'cancelled'
    and paid_at is null;

  if v_matched <> array_length(p_order_ids, 1) then
    raise exception 'Some orders are already settled, cancelled, or not yours';
  end if;

  -- Validate the reward before validating money.
  if p_reward is not null then
    v_reward_member := (p_reward ->> 'member_id')::uuid;
    v_reward_item   := (p_reward ->> 'order_item_id')::uuid;

    select oi.* into v_item from public.order_items oi
    where oi.id = v_reward_item and oi.order_id = any (p_order_ids);
    if not found then
      raise exception 'Reward item is not part of this tab';
    end if;

    if not exists (
      select 1 from public.loyalty_members m
      where m.id = v_reward_member and m.restaurant_id = v_rid
        and (m.visits / 10) - m.rewards_redeemed > 0
    ) then
      raise exception 'This member has no reward available';
    end if;

    v_comp := least(v_item.line_total, v_due);
  end if;

  for v_pay in select * from jsonb_array_elements(p_payments) loop
    if coalesce((v_pay ->> 'amount')::numeric, 0) < 0
       or coalesce((v_pay ->> 'tip')::numeric, 0) < 0 then
      raise exception 'Payment amounts cannot be negative';
    end if;
    v_paid := v_paid + coalesce((v_pay ->> 'amount')::numeric, 0);
  end loop;

  if round(v_paid, 2) <> round(v_due - v_comp, 2) then
    raise exception 'Payments (%) must equal the amount due (%)', round(v_paid, 2), round(v_due - v_comp, 2);
  end if;

  for v_pay in select * from jsonb_array_elements(p_payments) loop
    insert into public.payments (restaurant_id, table_id, order_ids, amount, tip, method)
    values (
      v_rid,
      p_table_id,
      p_order_ids,
      coalesce((v_pay ->> 'amount')::numeric, 0),
      coalesce((v_pay ->> 'tip')::numeric, 0),
      coalesce(v_pay ->> 'method', 'cash')
    );
  end loop;

  update public.orders
  set paid_at = now(), status = 'completed', bill_requested = false
  where id = any (p_order_ids);

  -- Record the redemption atomically (race-guarded).
  if p_reward is not null then
    update public.loyalty_members
    set rewards_redeemed = rewards_redeemed + 1
    where id = v_reward_member
      and restaurant_id = v_rid
      and (visits / 10) - rewards_redeemed > 0;
    if not found then
      raise exception 'Reward was already redeemed';
    end if;

    insert into public.loyalty_redemptions (restaurant_id, member_id, order_item_id, amount)
    values (v_rid, v_reward_member, v_reward_item, v_comp);
  end if;

  -- Loyalty: a visit counts only now that money changed hands.
  select coalesce(loyalty_min_spend, 0) into v_min_spend
  from public.restaurants where id = v_rid;

  for v_member in
    select o.loyalty_member_id as member_id, sum(o.total) as spend
    from public.orders o
    where o.id = any (p_order_ids) and o.loyalty_member_id is not null
    group by o.loyalty_member_id
  loop
    if v_member.spend >= v_min_spend then
      update public.loyalty_members
      set visits = visits + 1, last_visit_at = now()
      where id = v_member.member_id
        and restaurant_id = v_rid
        and (last_visit_at is null or last_visit_at < now() - interval '3 hours');
    end if;
  end loop;
end;
$$;
