-- ============================================================================
-- Payments (POS phase 1)
-- Records how each table's tab was settled (cash/card/other, with tips) and
-- marks orders paid. Settling is atomic via the settle_tab RPC.
-- ============================================================================

alter table public.orders
  add column if not exists paid_at timestamptz;

create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id      uuid references public.tables (id) on delete set null,
  order_ids     uuid[] not null default '{}',
  amount        numeric(10, 2) not null check (amount >= 0),
  tip           numeric(10, 2) not null default 0 check (tip >= 0),
  method        text not null check (method in ('cash', 'card', 'other')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_payments_restaurant on public.payments (restaurant_id, created_at);

alter table public.payments enable row level security;

create policy "payments: read" on public.payments
  for select using (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  );

create policy "payments: staff inserts" on public.payments
  for insert with check (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  );

-- Settle a table's tab atomically: validate amounts, record the payment(s),
-- and mark every order paid + completed. SECURITY INVOKER, so the staff RLS
-- policies above (and on orders) still apply.
-- p_payments: jsonb array of { method, amount, tip }
create or replace function public.settle_tab(
  p_table_id  uuid,
  p_order_ids uuid[],
  p_payments  jsonb
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_rid     uuid := public.current_restaurant_id();
  v_due     numeric(10, 2);
  v_matched int;
  v_paid    numeric(10, 2) := 0;
  v_pay     jsonb;
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
end;
$$;

grant execute on function public.settle_tab(uuid, uuid[], jsonb) to authenticated;
