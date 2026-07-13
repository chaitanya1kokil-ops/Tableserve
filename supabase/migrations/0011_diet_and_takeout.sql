-- ============================================================================
-- Veg/non-veg marks + takeout orders
-- - menu_items.diet: 'veg' | 'non_veg' | null (unmarked). Shown to guests as
--   the classic green/red dot; set by the restaurant in the menu editor.
-- - orders.order_type: 'dine_in' | 'takeout', chosen by the guest in the cart.
-- - place_order gains p_order_type (older 4-arg clients keep working via the
--   default; the old overload is dropped to avoid PostgREST ambiguity).
-- ============================================================================

alter table public.menu_items
  add column if not exists diet text check (diet in ('veg', 'non_veg'));

alter table public.orders
  add column if not exists order_type text not null default 'dine_in'
    check (order_type in ('dine_in', 'takeout'));

drop function if exists public.place_order(uuid, uuid, jsonb, text);

create or replace function public.place_order(
  p_restaurant_id uuid,
  p_table_id      uuid,
  p_items         jsonb,
  p_notes         text default null,
  p_order_type    text default 'dine_in'
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_order_id uuid;
  v_subtotal numeric(10, 2) := 0;
  v_rate     numeric(5, 2)  := 0;
  v_tax      numeric(10, 2) := 0;
  v_item     jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cannot place an empty order';
  end if;

  select coalesce(tax_rate, 0) into v_rate
  from public.restaurants
  where id = p_restaurant_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + coalesce((v_item ->> 'line_total')::numeric, 0);
  end loop;

  v_tax := round(v_subtotal * v_rate / 100, 2);

  insert into public.orders (
    restaurant_id, table_id, customer_id, status, subtotal, tax, total, notes, order_type
  )
  values (
    p_restaurant_id, p_table_id, auth.uid(), 'new',
    v_subtotal, v_tax, v_subtotal + v_tax, p_notes,
    coalesce(nullif(p_order_type, ''), 'dine_in')
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.order_items (
      order_id, restaurant_id, menu_item_id, name_snapshot,
      unit_price, quantity, selected_options, line_total
    ) values (
      v_order_id,
      p_restaurant_id,
      nullif(v_item ->> 'menu_item_id', '')::uuid,
      v_item ->> 'name_snapshot',
      coalesce((v_item ->> 'unit_price')::numeric, 0),
      coalesce((v_item ->> 'quantity')::int, 1),
      coalesce(v_item -> 'selected_options', '[]'::jsonb),
      coalesce((v_item ->> 'line_total')::numeric, 0)
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(uuid, uuid, jsonb, text, text) to anon, authenticated;
