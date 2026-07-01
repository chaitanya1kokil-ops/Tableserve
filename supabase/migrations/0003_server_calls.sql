-- ============================================================================
-- TableServe — 0003: "Call server" requests
-- ----------------------------------------------------------------------------
-- A customer at a table can call a waiter over (independent of any order).
-- Staff see pending calls live on the Orders board and resolve them.
--
-- Safe to run more than once (idempotent).
-- ============================================================================

create table if not exists public.server_calls (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id      uuid references public.tables (id) on delete set null,
  customer_id   uuid,                       -- anonymous auth.uid() of the customer
  status        text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists idx_server_calls_restaurant on public.server_calls (restaurant_id);
create index if not exists idx_server_calls_status      on public.server_calls (status);

alter table public.server_calls enable row level security;

-- Customer creates a call for an ACTIVE restaurant, at one of its tables.
drop policy if exists "server_calls: customer inserts" on public.server_calls;
create policy "server_calls: customer inserts" on public.server_calls
  for insert with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.status = 'active'
    )
    and (
      table_id is null or exists (
        select 1 from public.tables t
        where t.id = table_id and t.restaurant_id = server_calls.restaurant_id
      )
    )
  );

-- Read: customer sees own; staff/owner see their restaurant's; admin all.
drop policy if exists "server_calls: read" on public.server_calls;
create policy "server_calls: read" on public.server_calls
  for select using (
    customer_id = auth.uid()
    or restaurant_id = public.current_restaurant_id()
    or public.is_platform_admin()
  );

-- Staff/owner (or admin) resolve calls for their own restaurant.
drop policy if exists "server_calls: staff updates" on public.server_calls;
create policy "server_calls: staff updates" on public.server_calls
  for update using (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  ) with check (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  );

grant all on public.server_calls to anon, authenticated;

-- Realtime so pending calls light up the Orders board instantly.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'server_calls'
  ) then
    alter publication supabase_realtime add table public.server_calls;
  end if;
end $$;

-- ============================================================================
-- DONE.
-- ============================================================================
