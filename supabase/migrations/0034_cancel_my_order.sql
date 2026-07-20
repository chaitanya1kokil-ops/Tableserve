-- Let a customer cancel their OWN order while it hasn't started yet (still
-- 'new', or 'awaiting_payment' for pay-first trucks) and isn't paid. Customers
-- have no UPDATE policy on orders, so this is SECURITY DEFINER but strictly
-- scoped to the caller's own, not-yet-started, unpaid order.
create or replace function public.cancel_my_order(p_order_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  update public.orders
     set status = 'cancelled', updated_at = now()
   where id = p_order_id
     and customer_id = auth.uid()
     and status in ('new', 'awaiting_payment')
     and paid_at is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

grant execute on function public.cancel_my_order(uuid) to anon, authenticated;
