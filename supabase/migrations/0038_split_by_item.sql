-- ============================================================================
-- Split a tab by item
--
-- Splitting a tab evenly already worked: settle_tab takes an array of payments
-- and writes one row per payer. What was missing is a record of WHICH items
-- each payer covered, so a split bill can be reconstructed afterwards (guest
-- disputes a charge, staff reprint one person's portion, per-item reporting).
--
-- payments.item_ids holds the order_items covered by that payment. Empty means
-- "no item breakdown" — an even split or a single payer — so every existing row
-- and every existing caller stays valid. The function signature is unchanged;
-- item_ids is read from each element of the p_payments array when present.
-- ============================================================================

alter table public.payments
  add column if not exists item_ids uuid[] not null default '{}';

comment on column public.payments.item_ids is
  'order_items covered by this payment when the tab was split by item. Empty for even splits and single payments.';

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
  v_item_ids      uuid[];
  v_all_items     uuid[];
  v_seen          uuid[] := '{}';
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

  -- Every order_item on this tab, for validating the item breakdown below.
  select coalesce(array_agg(oi.id), '{}')
  into v_all_items
  from public.order_items oi
  where oi.order_id = any (p_order_ids);

  for v_pay in select * from jsonb_array_elements(p_payments) loop
    if coalesce((v_pay ->> 'amount')::numeric, 0) < 0
       or coalesce((v_pay ->> 'tip')::numeric, 0) < 0 then
      raise exception 'Payment amounts cannot be negative';
    end if;
    v_paid := v_paid + coalesce((v_pay ->> 'amount')::numeric, 0);

    -- An item breakdown, when given, must reference items on this tab and must
    -- not bill the same item to two payers.
    if (v_pay -> 'item_ids') is not null and jsonb_typeof(v_pay -> 'item_ids') = 'array' then
      select coalesce(array_agg(value::uuid), '{}')
      into v_item_ids
      from jsonb_array_elements_text(v_pay -> 'item_ids');

      if not (v_item_ids <@ v_all_items) then
        raise exception 'Split references an item that is not on this tab';
      end if;
      if v_seen && v_item_ids then
        raise exception 'An item was assigned to more than one payer';
      end if;
      v_seen := v_seen || v_item_ids;
    end if;
  end loop;

  if round(v_paid, 2) <> round(v_due - v_comp, 2) then
    raise exception 'Payments (%) must equal the amount due (%)', round(v_paid, 2), round(v_due - v_comp, 2);
  end if;

  for v_pay in select * from jsonb_array_elements(p_payments) loop
    if (v_pay -> 'item_ids') is not null and jsonb_typeof(v_pay -> 'item_ids') = 'array' then
      select coalesce(array_agg(value::uuid), '{}')
      into v_item_ids
      from jsonb_array_elements_text(v_pay -> 'item_ids');
    else
      v_item_ids := '{}';
    end if;

    insert into public.payments (restaurant_id, table_id, order_ids, amount, tip, method, item_ids)
    values (
      v_rid,
      p_table_id,
      p_order_ids,
      coalesce((v_pay ->> 'amount')::numeric, 0),
      coalesce((v_pay ->> 'tip')::numeric, 0),
      coalesce(v_pay ->> 'method', 'cash'),
      v_item_ids
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

grant execute on function public.settle_tab(uuid, uuid[], jsonb, jsonb) to authenticated;
