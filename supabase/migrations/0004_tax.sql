-- ============================================================================
-- Tax support
-- Each restaurant sets a tax_rate (%). place_order computes tax server-side
-- so customer and staff orders both store subtotal / tax / total.
-- ============================================================================

alter table public.restaurants
  add column if not exists tax_rate numeric(5, 2) not null default 0
    check (tax_rate >= 0 and tax_rate <= 100);

alter table public.orders
  add column if not exists subtotal numeric(10, 2) not null default 0,
  add column if not exists tax numeric(10, 2) not null default 0;

-- Existing orders were placed without tax: their total is the subtotal.
update public.orders set subtotal = total where subtotal = 0 and total > 0;

-- Recreate place_order to apply the restaurant's tax rate.
create or replace function public.place_order(
  p_restaurant_id uuid,
  p_table_id      uuid,
  p_items         jsonb,
  p_notes         text default null
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
    restaurant_id, table_id, customer_id, status, subtotal, tax, total, notes
  )
  values (
    p_restaurant_id, p_table_id, auth.uid(), 'new',
    v_subtotal, v_tax, v_subtotal + v_tax, p_notes
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
