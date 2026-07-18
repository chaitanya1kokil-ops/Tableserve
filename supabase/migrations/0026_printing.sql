-- ============================================================================
-- Kitchen printing: auto-print each new order to the restaurant's own printer.
-- Two self-serve routes per restaurant (owner picks in dashboard > Settings):
--   * 'cloudprnt' — a Star CloudPRNT printer polls /api/cloudprnt directly.
--   * 'printnode' — /api/print-order pushes the ticket to any printer via
--                   the restaurant's own PrintNode account.
--
-- Secrets (CloudPRNT url token, PrintNode API key) live in their OWN table,
-- NOT on restaurants — because public.restaurants is world-readable for ACTIVE
-- restaurants (customers browse menus), which would leak the keys. This table
-- has no public read policy: only the owning restaurant + service_role.
-- ============================================================================

create table if not exists public.printer_settings (
  restaurant_id        uuid primary key references public.restaurants (id) on delete cascade,
  enabled              boolean not null default false,
  provider             text check (provider in ('cloudprnt', 'printnode')),
  -- Shared secret embedded in the CloudPRNT poll URL so only the right printer
  -- (and the owner's "test" button) can pull a restaurant's tickets.
  token                text not null default encode(gen_random_bytes(16), 'hex'),
  printnode_api_key    text,
  printnode_printer_id text,
  updated_at           timestamptz not null default now()
);

-- Track what has already been sent to a printer so nothing double-prints.
alter table public.orders
  add column if not exists printed_at timestamptz;

-- Fast lookup for the CloudPRNT poll (oldest unprinted order per restaurant).
create index if not exists idx_orders_unprinted
  on public.orders (restaurant_id, created_at)
  where printed_at is null;

alter table public.printer_settings enable row level security;

-- Owner (or platform admin) full access to their own row. No anon/public read.
create policy "printers: owner all" on public.printer_settings
  for all using (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  ) with check (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  );

grant all on public.printer_settings to authenticated;   -- RLS still restricts rows
grant all on public.printer_settings to service_role;
