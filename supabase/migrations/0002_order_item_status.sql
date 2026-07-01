-- ============================================================================
-- TableServe — 0002: per-item kitchen status
-- ----------------------------------------------------------------------------
-- Lets kitchen stations advance individual items in an order independently
-- (e.g. start the fries while the burger is still queued). The parent order's
-- status is kept in sync automatically (forward-only) so the reception board
-- and the customer's live status still reflect overall progress.
--
-- Safe to run more than once (idempotent).
-- ============================================================================

-- 1. Per-item status column (new -> preparing -> ready).
alter table public.order_items
  add column if not exists status text not null default 'new'
    check (status in ('new', 'preparing', 'ready'));

create index if not exists idx_order_items_status on public.order_items (status);

-- 2. Allow owners/staff (and admins) to update items in their own restaurant.
--    (Previously order_items had no UPDATE policy — only read + customer insert.)
drop policy if exists "order_items: staff updates" on public.order_items;
create policy "order_items: staff updates" on public.order_items
  for update using (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  ) with check (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  );

-- 3. Roll item progress up to the parent order (forward-only, never downgrades,
--    never touches served/completed/cancelled which are set by waiters/staff).
--      all items ready            -> order 'ready'
--      any item preparing/ready   -> order 'preparing'
create or replace function public.sync_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_order    uuid := coalesce(new.order_id, old.order_id);
  v_total    int;
  v_ready    int;
  v_started  int;
  v_cur      text;
  v_computed text;
  rank_cur   int;
  rank_new   int;
begin
  select status into v_cur from public.orders where id = v_order;
  if v_cur is null or v_cur in ('served', 'completed', 'cancelled') then
    return coalesce(new, old);
  end if;

  select count(*),
         count(*) filter (where status = 'ready'),
         count(*) filter (where status in ('preparing', 'ready'))
    into v_total, v_ready, v_started
  from public.order_items
  where order_id = v_order;

  if v_total = 0 then
    return coalesce(new, old);
  elsif v_ready = v_total then
    v_computed := 'ready';
  elsif v_started > 0 then
    v_computed := 'preparing';
  else
    v_computed := 'new';
  end if;

  rank_cur := case v_cur      when 'new' then 0 when 'preparing' then 1 when 'ready' then 2 else 0 end;
  rank_new := case v_computed when 'new' then 0 when 'preparing' then 1 when 'ready' then 2 else 0 end;

  if rank_new > rank_cur then
    update public.orders set status = v_computed where id = v_order;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists order_items_sync_status on public.order_items;
create trigger order_items_sync_status
  after insert or update of status or delete on public.order_items
  for each row execute function public.sync_order_status();

-- ============================================================================
-- DONE.
-- ============================================================================
