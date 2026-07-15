-- ============================================================================
-- Food trucks (groundwork)
-- A restaurant is a 'restaurant' or a 'food_truck' (chosen at onboarding).
-- Food truck flow: one QR (no tables), the customer enters their NAME, orders,
-- and PAYS ONLINE before the order is released. Orders are created in
-- 'awaiting_payment' and only reach the kitchen once payment is confirmed
-- (done by the Stripe webhook in a later migration). No walk-off loss: an
-- unpaid order never becomes food.
-- ============================================================================

alter table public.restaurants
  add column if not exists business_type text not null default 'restaurant'
    check (business_type in ('restaurant', 'food_truck'));

alter table public.orders
  add column if not exists customer_name text;

-- New pre-kitchen state for orders that are placed but not yet paid.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_payment', 'new', 'preparing', 'ready', 'served', 'completed', 'cancelled'));

-- place_order gains p_customer_name; food-truck orders start awaiting payment.
drop function if exists public.place_order(uuid, uuid, jsonb, text, text, uuid);

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
  v_item     jsonb;
  v_biz      text;
  v_status   text;
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

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + coalesce((v_item ->> 'line_total')::numeric, 0);
  end loop;
  v_tax := round(v_subtotal * v_rate / 100, 2);

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

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (
      order_id, restaurant_id, menu_item_id, name_snapshot,
      unit_price, quantity, selected_options, line_total
    ) values (
      v_order_id, p_restaurant_id,
      nullif(v_item ->> 'menu_item_id', '')::uuid,
      v_item ->> 'name_snapshot',
      coalesce((v_item ->> 'unit_price')::numeric, 0),
      coalesce((v_item ->> 'quantity')::int, 1),
      coalesce(v_item -> 'selected_options', '[]'::jsonb),
      coalesce((v_item ->> 'line_total')::numeric, 0)
    );
  end loop;

  if p_loyalty_member_id is not null then
    perform public.apply_loyalty(p_loyalty_member_id, v_order_id);
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(uuid, uuid, jsonb, text, text, uuid, text) to anon, authenticated;
