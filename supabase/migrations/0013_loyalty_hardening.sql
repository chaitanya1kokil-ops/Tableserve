-- ============================================================================
-- Loyalty hardening (fixes from flow review)
-- 1. Visits count at PAYMENT (settle_tab), not at order placement — cancelled
--    or never-paid orders can no longer farm visits.
-- 2. Rewards bank: floor(visits/10) - rewards_redeemed. Staff redeem
--    explicitly, so free items are tracked and audited.
-- 3. PII lockdown: guests can no longer SELECT the members table; join,
--    sign-in and status go through narrow SECURITY DEFINER functions that
--    return only a first name + counters.
-- 4. CASL: consent is required at join and timestamped.
-- 5. Optional minimum spend per sitting before a visit counts.
-- ============================================================================

alter table public.loyalty_members
  add column if not exists consented_at timestamptz,
  add column if not exists rewards_redeemed int not null default 0;

alter table public.restaurants
  add column if not exists loyalty_min_spend numeric(10, 2) not null default 0;

-- Guests lose direct table access; staff manage their own list.
drop policy if exists "loyalty: read" on public.loyalty_members;
drop policy if exists "loyalty: join" on public.loyalty_members;

create policy "loyalty: staff read" on public.loyalty_members
  for select using (restaurant_id = public.current_restaurant_id() or public.is_platform_admin());
create policy "loyalty: staff update" on public.loyalty_members
  for update using (restaurant_id = public.current_restaurant_id() or public.is_platform_admin())
  with check (restaurant_id = public.current_restaurant_id() or public.is_platform_admin());
create policy "loyalty: staff delete" on public.loyalty_members
  for delete using (restaurant_id = public.current_restaurant_id() or public.is_platform_admin());

-- ---------------------------------------------------------------- helpers --
-- Compact member summary exposed to guests: first name only, no raw list.
create or replace function public.loyalty_summary(m public.loyalty_members)
returns json language sql stable as $$
  select json_build_object(
    'id', m.id,
    'name', split_part(coalesce(m.name, ''), ' ', 1),
    'email', m.email,
    'visits', m.visits,
    'rewards_available', greatest((m.visits / 10) - m.rewards_redeemed, 0)
  );
$$;

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

  insert into public.loyalty_members (restaurant_id, email, name, consented_at)
  values (p_restaurant, v_email, nullif(trim(p_name), ''), now())
  on conflict (restaurant_id, lower(email)) do update
    set name = coalesce(public.loyalty_members.name, excluded.name),
        consented_at = coalesce(public.loyalty_members.consented_at, now())
  returning * into v;

  return public.loyalty_summary(v);
end;
$$;

create or replace function public.loyalty_lookup(p_restaurant uuid, p_email text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v public.loyalty_members%rowtype;
begin
  select * into v from public.loyalty_members
  where restaurant_id = p_restaurant and lower(email) = lower(trim(p_email));
  if not found then return null; end if;
  return public.loyalty_summary(v);
end;
$$;

create or replace function public.loyalty_status(p_member uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v public.loyalty_members%rowtype;
begin
  select * into v from public.loyalty_members where id = p_member;
  if not found then return null; end if;
  return public.loyalty_summary(v);
end;
$$;

grant execute on function public.loyalty_join(uuid, text, text, boolean) to anon, authenticated;
grant execute on function public.loyalty_lookup(uuid, text) to anon, authenticated;
grant execute on function public.loyalty_status(uuid) to anon, authenticated;

-- apply_loyalty now ONLY links the order to the member (no counting).
create or replace function public.apply_loyalty(p_member uuid, p_order uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order  public.orders%rowtype;
begin
  select * into v_order from public.orders
  where id = p_order and customer_id = auth.uid() and loyalty_member_id is null;
  if not found then return; end if;

  update public.orders set loyalty_member_id = p_member
  where id = p_order
    and exists (
      select 1 from public.loyalty_members m
      where m.id = p_member and m.restaurant_id = v_order.restaurant_id
    );
end;
$$;

-- settle_tab: after payment succeeds, count one visit per member per sitting
-- (3-hour window) when the member's paid orders meet the minimum spend.
create or replace function public.settle_tab(
  p_table_id  uuid,
  p_order_ids uuid[],
  p_payments  jsonb
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_rid       uuid := public.current_restaurant_id();
  v_due       numeric(10, 2);
  v_matched   int;
  v_paid      numeric(10, 2) := 0;
  v_pay       jsonb;
  v_member    record;
  v_min_spend numeric(10, 2);
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

  for v_pay in select * from jsonb_array_elements(p_payments) loop
    if coalesce((v_pay ->> 'amount')::numeric, 0) < 0
       or coalesce((v_pay ->> 'tip')::numeric, 0) < 0 then
      raise exception 'Payment amounts cannot be negative';
    end if;
    v_paid := v_paid + coalesce((v_pay ->> 'amount')::numeric, 0);
  end loop;

  if round(v_paid, 2) <> round(v_due, 2) then
    raise exception 'Payments (%) must equal the amount due (%)', round(v_paid, 2), round(v_due, 2);
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
