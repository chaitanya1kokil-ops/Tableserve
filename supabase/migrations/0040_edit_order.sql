-- ============================================================================
-- Staff can correct an order after it has gone out
--
-- A dish comes back wrong, a guest adds a coffee at the end, a plate is
-- returned. Until now the only lever was cancelling the whole order.
--
-- Removed items are VOIDED, not deleted. A returned dish was still cooked and
-- still cost food — deleting the row would erase that from history and from
-- any waste reporting, and would silently rewrite a ticket the kitchen already
-- printed. void_reason records why.
--
-- Added items are priced from the menu on the server, exactly like place_order
-- (see 0031): the client says WHAT was added, never what it costs.
-- ============================================================================

alter table public.order_items
  add column if not exists voided_at   timestamptz,
  add column if not exists void_reason text;

comment on column public.order_items.voided_at is
  'Set when staff removed this line after the fact (returned/wrong dish). Voided lines keep their history but are excluded from order totals.';

create index if not exists idx_order_items_live
  on public.order_items (order_id) where voided_at is null;

-- Recompute an order's money from its live (non-voided) lines.
create or replace function public.recalc_order_totals(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sub  numeric(10, 2);
  v_rate numeric(5, 2);
  v_tax  numeric(10, 2);
begin
  select coalesce(sum(line_total), 0) into v_sub
  from public.order_items
  where order_id = p_order_id and voided_at is null;

  select coalesce(r.tax_rate, 0) into v_rate
  from public.orders o join public.restaurants r on r.id = o.restaurant_id
  where o.id = p_order_id;

  v_tax := round(v_sub * v_rate / 100, 2);

  update public.orders
  set subtotal = v_sub, tax = v_tax, total = v_sub + v_tax, updated_at = now()
  where id = p_order_id;
end;
$$;

-- Void lines and/or add new ones, then re-price the order.
--   p_void: order_items.id[] to remove
--   p_add:  [{ menu_item_id, quantity, selected_options: [{group, value}] }]
-- Returns the new { subtotal, tax, total, voided, added }.
create or replace function public.edit_order(
  p_order_id uuid,
  p_void     uuid[] default '{}',
  p_add      jsonb  default '[]'::jsonb,
  p_reason   text   default null
) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_rid     uuid := public.current_restaurant_id();
  v_order   public.orders%rowtype;
  v_item    jsonb;
  v_opt     jsonb;
  v_mid     uuid;
  v_qty     int;
  v_base    numeric(10, 2);
  v_name    text;
  v_avail   boolean;
  v_delta   numeric(10, 2);
  v_unit    numeric(10, 2);
  v_voided  int := 0;
  v_added   int := 0;
begin
  if v_rid is null then
    raise exception 'Not authorized';
  end if;

  select * into v_order from public.orders
  where id = p_order_id and restaurant_id = v_rid;
  if not found then
    raise exception 'Order not found';
  end if;

  -- A settled order is a financial record. Changing it would put the takings
  -- out of step with what was actually charged; refund through the till first.
  if v_order.paid_at is not null then
    raise exception 'This order is already paid — refund it instead of editing.';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'This order was cancelled.';
  end if;

  -- ---- void ---------------------------------------------------------------
  if p_void is not null and array_length(p_void, 1) is not null then
    update public.order_items
    set voided_at = now(), void_reason = nullif(trim(p_reason), '')
    where order_id = p_order_id
      and restaurant_id = v_rid
      and id = any (p_void)
      and voided_at is null;
    get diagnostics v_voided = row_count;
  end if;

  -- ---- add (priced server-side) -------------------------------------------
  if p_add is not null and jsonb_typeof(p_add) = 'array' then
    for v_item in select * from jsonb_array_elements(p_add) loop
      v_mid := nullif(v_item ->> 'menu_item_id', '')::uuid;
      v_qty := greatest(coalesce((v_item ->> 'quantity')::int, 1), 1);

      select price, name, is_available
      into v_base, v_name, v_avail
      from public.menu_items
      where id = v_mid and restaurant_id = v_rid;

      if v_base is null then
        raise exception 'That item is no longer on the menu.';
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

      insert into public.order_items (
        order_id, restaurant_id, menu_item_id, name_snapshot,
        unit_price, quantity, selected_options, line_total
      ) values (
        p_order_id, v_rid, v_mid, v_name, v_unit, v_qty,
        coalesce(v_item -> 'selected_options', '[]'::jsonb),
        round(v_unit * v_qty, 2)
      );
      v_added := v_added + 1;
    end loop;
  end if;

  if v_voided = 0 and v_added = 0 then
    raise exception 'Nothing to change.';
  end if;

  perform public.recalc_order_totals(p_order_id);

  select * into v_order from public.orders where id = p_order_id;
  return jsonb_build_object(
    'subtotal', v_order.subtotal,
    'tax',      v_order.tax,
    'total',    v_order.total,
    'voided',   v_voided,
    'added',    v_added
  );
end;
$$;

revoke execute on function public.edit_order(uuid, uuid[], jsonb, text) from public;
revoke execute on function public.recalc_order_totals(uuid) from public;
grant execute on function public.edit_order(uuid, uuid[], jsonb, text) to authenticated;
