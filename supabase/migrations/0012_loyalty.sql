-- ============================================================================
-- Loyalty / rewards program
-- - loyalty_members: name + email per restaurant (promo mailing list),
--   with a visit counter. Every 10th visit earns a free item (UI-side).
-- - restaurants.loyalty_brand: which brand shows the join prompt (null = off).
-- - Visits count ONLY when an order is placed (never on scan): place_order
--   links the order to the member and increments visits at most once per
--   3-hour sitting, so multiple rounds in one meal are one visit.
-- ============================================================================

create table if not exists public.loyalty_members (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  email         text not null,
  name          text,
  visits        int not null default 0,
  last_visit_at timestamptz,
  created_at    timestamptz not null default now()
);

create unique index if not exists idx_loyalty_member_email
  on public.loyalty_members (restaurant_id, lower(email));

alter table public.restaurants
  add column if not exists loyalty_brand text;

alter table public.orders
  add column if not exists loyalty_member_id uuid references public.loyalty_members (id) on delete set null;

alter table public.loyalty_members enable row level security;

-- Guests join and look themselves up by email; staff read their own list.
create policy "loyalty: read" on public.loyalty_members
  for select using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'active')
    or restaurant_id = public.current_restaurant_id()
    or public.is_platform_admin()
  );

create policy "loyalty: join" on public.loyalty_members
  for insert with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'active')
  );

-- Links a just-placed order to a member and counts the visit. SECURITY
-- DEFINER because guests have no UPDATE rights; safe because it only touches
-- orders the caller just created (customer_id = auth.uid()) that are not yet
-- linked, and members of that same restaurant.
create or replace function public.apply_loyalty(p_member uuid, p_order uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order  public.orders%rowtype;
  v_member public.loyalty_members%rowtype;
begin
  select * into v_order from public.orders
  where id = p_order and customer_id = auth.uid() and loyalty_member_id is null;
  if not found then return; end if;

  select * into v_member from public.loyalty_members
  where id = p_member and restaurant_id = v_order.restaurant_id;
  if not found then return; end if;

  update public.orders set loyalty_member_id = p_member where id = p_order;

  -- One visit per sitting: only count if the last counted visit started
  -- more than 3 hours ago.
  if v_member.last_visit_at is null or v_member.last_visit_at < now() - interval '3 hours' then
    update public.loyalty_members
    set visits = visits + 1, last_visit_at = now()
    where id = p_member;
  end if;
end;
$$;

grant execute on function public.apply_loyalty(uuid, uuid) to anon, authenticated;

-- place_order gains p_loyalty_member_id (older callers keep working).
drop function if exists public.place_order(uuid, uuid, jsonb, text, text);

create or replace function public.place_order(
  p_restaurant_id     uuid,
  p_table_id          uuid,
  p_items             jsonb,
  p_notes             text default null,
  p_order_type        text default 'dine_in',
  p_loyalty_member_id uuid default null
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

  if p_loyalty_member_id is not null then
    perform public.apply_loyalty(p_loyalty_member_id, v_order_id);
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(uuid, uuid, jsonb, text, text, uuid) to anon, authenticated;
