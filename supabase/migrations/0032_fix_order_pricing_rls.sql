-- ============================================================================
-- Fix: 0031 priced the order with an INSERT-then-UPDATE, but place_order runs
-- as the customer (SECURITY INVOKER) and customers have no UPDATE policy on
-- orders — so the total update was silently dropped by RLS and every order
-- saved with total 0. Recompute prices in a first pass, then write the order
-- in a SINGLE insert with the correct totals (customers CAN insert).
-- ============================================================================

create or replace function public.place_order(
  p_restaurant_id     uuid,
  p_table_id          uuid,
  p_items             jsonb,
  p_notes             text default null,
  p_order_type        text default 'dine_in',
  p_loyalty_member_id uuid default null,
  p_customer_name     text default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_order_id uuid;
  v_subtotal numeric(10, 2) := 0;
  v_rate     numeric(5, 2)  := 0;
  v_tax      numeric(10, 2) := 0;
  v_biz      text;
  v_status   text;
  v_item     jsonb;
  v_opt      jsonb;
  v_mid      uuid;
  v_qty      int;
  v_base     numeric(10, 2);
  v_name     text;
  v_avail    boolean;
  v_delta    numeric(10, 2);
  v_unit     numeric(10, 2);
  v_line     numeric(10, 2);
  v_priced   jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cannot place an empty order';
  end if;

  select coalesce(tax_rate, 0), coalesce(business_type, 'restaurant')
  into v_rate, v_biz
  from public.restaurants where id = p_restaurant_id;

  if v_biz = 'food_truck' and coalesce(trim(p_customer_name), '') = '' then
    raise exception 'Please enter your name for the order.';
  end if;
  v_status := case when v_biz = 'food_truck' then 'awaiting_payment' else 'new' end;

  -- Pass 1: price every line from the DB (no writes yet), building the subtotal.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_mid := nullif(v_item ->> 'menu_item_id', '')::uuid;
    v_qty := greatest(coalesce((v_item ->> 'quantity')::int, 1), 1);

    select price, name, is_available
    into v_base, v_name, v_avail
    from public.menu_items
    where id = v_mid and restaurant_id = p_restaurant_id;

    if v_base is null then
      raise exception 'An item in your order is no longer on the menu.';
    end if;
    if not coalesce(v_avail, false) then
      raise exception '% is currently unavailable.', v_name;
    end if;

    v_delta := 0;
    if jsonb_typeof(v_item -> 'selected_options') = 'array' then
      for v_opt in select * from jsonb_array_elements(v_item -> 'selected_options') loop
        v_delta := v_delta + coalesce((
          select iov.price_delta
          from public.item_option_values iov
          join public.item_options io on io.id = iov.option_id
          where io.item_id = v_mid
            and io.name = (v_opt ->> 'group')
            and iov.name = (v_opt ->> 'value')
          order by iov.price_delta desc
          limit 1
        ), 0);
      end loop;
    end if;

    v_unit := round(v_base + v_delta, 2);
    v_line := round(v_unit * v_qty, 2);
    v_subtotal := v_subtotal + v_line;

    v_priced := v_priced || jsonb_build_object(
      'mid', v_mid, 'name', v_name, 'unit', v_unit, 'qty', v_qty, 'line', v_line,
      'opts', coalesce(v_item -> 'selected_options', '[]'::jsonb)
    );
  end loop;

  v_tax := round(v_subtotal * v_rate / 100, 2);

  -- Single insert with the correct, server-computed totals.
  insert into public.orders (
    restaurant_id, table_id, customer_id, status, subtotal, tax, total, notes,
    order_type, customer_name
  )
  values (
    p_restaurant_id, p_table_id, auth.uid(), v_status,
    v_subtotal, v_tax, v_subtotal + v_tax, p_notes,
    coalesce(nullif(p_order_type, ''), 'dine_in'), nullif(trim(p_customer_name), '')
  )
  returning id into v_order_id;

  -- Line items from the priced list computed above.
  for v_item in select * from jsonb_array_elements(v_priced) loop
    insert into public.order_items (
      order_id, restaurant_id, menu_item_id, name_snapshot,
      unit_price, quantity, selected_options, line_total
    ) values (
      v_order_id, p_restaurant_id,
      nullif(v_item ->> 'mid', '')::uuid,
      v_item ->> 'name',
      (v_item ->> 'unit')::numeric,
      (v_item ->> 'qty')::int,
      coalesce(v_item -> 'opts', '[]'::jsonb),
      (v_item ->> 'line')::numeric
    );
  end loop;

  if p_loyalty_member_id is not null then
    perform public.apply_loyalty(p_loyalty_member_id, v_order_id);
  end if;

  return v_order_id;
end;
$$;
