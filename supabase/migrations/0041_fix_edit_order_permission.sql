-- ============================================================================
-- Fix: "permission denied for function recalc_order_totals"
--
-- 0040 split the recalculation into its own SECURITY DEFINER helper and revoked
-- it from PUBLIC without granting it to anyone. edit_order is SECURITY INVOKER,
-- so it called that helper AS THE STAFF USER — who had no EXECUTE. Every edit
-- failed.
--
-- Granting the helper to authenticated would have fixed the error and left a
-- worse problem: recalc_order_totals is SECURITY DEFINER with no tenant check,
-- so any signed-in user could have rewritten the totals of ANY restaurant's
-- order by id. Instead the recalculation is inlined into edit_order, where it
-- runs under the caller's own RLS — staff may only update orders belonging to
-- their restaurant (see the orders update policy in 0001).
--
-- The helper is dropped: nothing else referenced it, and it existed for less
-- than an hour.
-- ============================================================================

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
  v_sub     numeric(10, 2);
  v_rate    numeric(5, 2);
  v_tax     numeric(10, 2);
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

  -- ---- re-price from the live lines (inlined; runs under the caller's RLS) --
  select coalesce(sum(line_total), 0) into v_sub
  from public.order_items
  where order_id = p_order_id and voided_at is null;

  select coalesce(tax_rate, 0) into v_rate
  from public.restaurants where id = v_rid;

  v_tax := round(v_sub * v_rate / 100, 2);

  update public.orders
  set subtotal = v_sub, tax = v_tax, total = v_sub + v_tax, updated_at = now()
  where id = p_order_id and restaurant_id = v_rid;

  return jsonb_build_object(
    'subtotal', v_sub,
    'tax',      v_tax,
    'total',    v_sub + v_tax,
    'voided',   v_voided,
    'added',    v_added
  );
end;
$$;

drop function if exists public.recalc_order_totals(uuid);

revoke execute on function public.edit_order(uuid, uuid[], jsonb, text) from public;
grant execute on function public.edit_order(uuid, uuid[], jsonb, text) to authenticated;
