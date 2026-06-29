-- ============================================================================
-- TableServe — Multi-restaurant ordering platform
-- Initial schema: tenants, menus, tables, orders + Row Level Security
-- ============================================================================
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- Multi-tenancy model: every tenant-owned row carries `restaurant_id`. RLS scopes
-- all access to the caller's own restaurant, with public read for ACTIVE restaurants
-- so anonymous customers can browse menus and place orders.
-- ============================================================================

-- Needed for gen_random_uuid() (present by default on Supabase, kept for safety).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- A user account. Mirrors auth.users (1:1). Anonymous customers do NOT get a row.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  full_name     text,
  role          text not null default 'owner'
                  check (role in ('platform_admin', 'owner', 'staff')),
  restaurant_id uuid,                       -- set during onboarding; FK added below
  created_at    timestamptz not null default now()
);

-- A tenant. One per restaurant business.
create table public.restaurants (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  slug         text unique,
  description  text,
  cuisine      text,
  logo_url     text,
  address      text,
  phone        text,
  accent_color text not null default '#ef4444',
  currency     text not null default 'USD',
  hours        jsonb,                        -- e.g. {"mon": "9-17", ...}
  status       text not null default 'active'
                 check (status in ('pending', 'active', 'suspended')),
  created_at   timestamptz not null default now()
);

-- Now that restaurants exists, wire up the profiles -> restaurants FK.
alter table public.profiles
  add constraint profiles_restaurant_id_fkey
  foreign key (restaurant_id) references public.restaurants (id) on delete set null;

-- Menu categories (Starters, Mains, Drinks, ...).
create table public.menu_categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now()
);

-- Menu items.
create table public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id   uuid references public.menu_categories (id) on delete set null,
  name          text not null,
  description   text,
  price         numeric(10, 2) not null default 0,
  image_url     text,
  is_available  boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- Modifier groups for an item (Size, Spice level, Extras, ...).
create table public.item_options (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  item_id        uuid not null references public.menu_items (id) on delete cascade,
  name           text not null,
  selection_type text not null default 'single'
                   check (selection_type in ('single', 'multiple')),
  is_required    boolean not null default false,
  sort_order     int not null default 0
);

-- Choices within a modifier group (Small/Medium/Large, +Cheese, ...).
create table public.item_option_values (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  option_id     uuid not null references public.item_options (id) on delete cascade,
  name          text not null,
  price_delta   numeric(10, 2) not null default 0,
  sort_order    int not null default 0
);

-- Physical tables. QR encodes /r/{restaurant_id}/t/{table_id}.
create table public.tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  label         text not null,
  created_at    timestamptz not null default now()
);

-- Orders placed by customers.
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  table_id       uuid references public.tables (id) on delete set null,
  customer_id    uuid,                       -- anonymous auth.uid() of the customer
  status         text not null default 'new'
                   check (status in ('new', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  total          numeric(10, 2) not null default 0,
  notes          text,
  bill_requested boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Line items for an order (with a snapshot of the item + chosen modifiers).
create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  restaurant_id    uuid not null references public.restaurants (id) on delete cascade,
  menu_item_id     uuid references public.menu_items (id) on delete set null,
  name_snapshot    text not null,
  unit_price       numeric(10, 2) not null default 0,
  quantity         int not null default 1 check (quantity > 0),
  selected_options jsonb not null default '[]'::jsonb,
  line_total       numeric(10, 2) not null default 0,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES
-- ----------------------------------------------------------------------------
create index idx_profiles_restaurant       on public.profiles (restaurant_id);
create index idx_restaurants_owner         on public.restaurants (owner_id);
create index idx_restaurants_status        on public.restaurants (status);
create index idx_categories_restaurant     on public.menu_categories (restaurant_id);
create index idx_items_restaurant          on public.menu_items (restaurant_id);
create index idx_items_category            on public.menu_items (category_id);
create index idx_options_item              on public.item_options (item_id);
create index idx_option_values_option      on public.item_option_values (option_id);
create index idx_tables_restaurant         on public.tables (restaurant_id);
create index idx_orders_restaurant         on public.orders (restaurant_id);
create index idx_orders_table              on public.orders (table_id);
create index idx_orders_customer           on public.orders (customer_id);
create index idx_orders_status             on public.orders (status);
create index idx_order_items_order         on public.order_items (order_id);
create index idx_order_items_restaurant    on public.order_items (restaurant_id);

-- ----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS (SECURITY DEFINER -> read profiles without RLS recursion)
-- ----------------------------------------------------------------------------
create or replace function public.current_restaurant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select restaurant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'platform_admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 4. TRIGGERS
-- ----------------------------------------------------------------------------

-- Create a profile row whenever a NON-anonymous user signs up.
-- Anonymous customers intentionally get no profile (they are not tenants).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'owner'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep orders.updated_at fresh.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. RPCs (atomic order placement + bill request, run with caller's RLS)
-- ----------------------------------------------------------------------------

-- Place an order + its line items atomically. SECURITY INVOKER => RLS applies.
-- p_items: jsonb array of
--   { menu_item_id, name_snapshot, unit_price, quantity, selected_options, line_total }
create or replace function public.place_order(
  p_restaurant_id uuid,
  p_table_id      uuid,
  p_items         jsonb,
  p_notes         text default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_order_id uuid;
  v_total    numeric(10, 2) := 0;
  v_item     jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cannot place an empty order';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + coalesce((v_item ->> 'line_total')::numeric, 0);
  end loop;

  insert into public.orders (restaurant_id, table_id, customer_id, status, total, notes)
  values (p_restaurant_id, p_table_id, auth.uid(), 'new', v_total, p_notes)
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

-- Customer asks for the bill for their open orders at a table.
-- SECURITY DEFINER because customers have no UPDATE policy on orders (only staff
-- do). The WHERE clause restricts the update to the caller's own orders, so this
-- stays safe: auth.uid() reflects the real caller even inside a definer function.
create or replace function public.request_bill(p_table_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders
     set bill_requested = true
   where table_id = p_table_id
     and customer_id = auth.uid()
     and status <> 'completed'
     and status <> 'cancelled';
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.restaurants        enable row level security;
alter table public.menu_categories    enable row level security;
alter table public.menu_items         enable row level security;
alter table public.item_options       enable row level security;
alter table public.item_option_values enable row level security;
alter table public.tables             enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;

-- ---- profiles --------------------------------------------------------------
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_platform_admin());

create policy "profiles: insert own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles: update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

-- ---- restaurants -----------------------------------------------------------
-- Public can see ACTIVE restaurants; owners see their own; admins see all.
create policy "restaurants: read" on public.restaurants
  for select using (
    status = 'active'
    or id = public.current_restaurant_id()
    or owner_id = auth.uid()
    or public.is_platform_admin()
  );

create policy "restaurants: owner creates" on public.restaurants
  for insert with check (owner_id = auth.uid());

create policy "restaurants: owner or admin updates" on public.restaurants
  for update using (owner_id = auth.uid() or public.is_platform_admin())
  with check (owner_id = auth.uid() or public.is_platform_admin());

create policy "restaurants: owner or admin deletes" on public.restaurants
  for delete using (owner_id = auth.uid() or public.is_platform_admin());

-- ---- generic tenant tables (menu_categories, menu_items, item_options,
--       item_option_values, tables) -- same shape, scoped by restaurant_id ----
-- Read: public for ACTIVE restaurants, owners/staff for their own, admin all.
-- Write: owners/staff for their own restaurant, or admin.
do $$
declare
  t text;
begin
  foreach t in array array[
    'menu_categories', 'menu_items', 'item_options', 'item_option_values', 'tables'
  ] loop
    execute format($f$
      create policy "%1$s: read" on public.%1$s
        for select using (
          exists (
            select 1 from public.restaurants r
            where r.id = %1$s.restaurant_id and r.status = 'active'
          )
          or restaurant_id = public.current_restaurant_id()
          or public.is_platform_admin()
        );

      create policy "%1$s: tenant insert" on public.%1$s
        for insert with check (
          restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
        );

      create policy "%1$s: tenant update" on public.%1$s
        for update using (
          restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
        ) with check (
          restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
        );

      create policy "%1$s: tenant delete" on public.%1$s
        for delete using (
          restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
        );
    $f$, t);
  end loop;
end $$;

-- ---- orders ----------------------------------------------------------------
-- Customer sees own; staff/owner see their restaurant's; admin all.
create policy "orders: read" on public.orders
  for select using (
    customer_id = auth.uid()
    or restaurant_id = public.current_restaurant_id()
    or public.is_platform_admin()
  );

-- Customer places an order for an ACTIVE restaurant at one of its tables.
create policy "orders: customer inserts" on public.orders
  for insert with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.status = 'active'
    )
    and (
      table_id is null or exists (
        select 1 from public.tables t
        where t.id = table_id and t.restaurant_id = orders.restaurant_id
      )
    )
  );

-- Staff/owner update status; admin too. (Customer "request bill" goes via RPC.)
create policy "orders: staff updates" on public.orders
  for update using (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  ) with check (
    restaurant_id = public.current_restaurant_id() or public.is_platform_admin()
  );

-- ---- order_items -----------------------------------------------------------
create policy "order_items: read" on public.order_items
  for select using (
    restaurant_id = public.current_restaurant_id()
    or public.is_platform_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

create policy "order_items: customer inserts" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 7. REALTIME (live orders board + customer status updates)
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;

-- ----------------------------------------------------------------------------
-- 8. STORAGE (public bucket for logos + menu photos, write scoped per tenant)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('restaurant-images', 'restaurant-images', true)
on conflict (id) do nothing;

create policy "images: public read" on storage.objects
  for select using (bucket_id = 'restaurant-images');

-- Authenticated tenants may write only under their own restaurant folder:
--   {restaurant_id}/logo.png , {restaurant_id}/items/burger.jpg , ...
create policy "images: tenant write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

create policy "images: tenant update" on storage.objects
  for update to authenticated using (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

create policy "images: tenant delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

-- ----------------------------------------------------------------------------
-- 9. GRANTS
-- ----------------------------------------------------------------------------
-- Supabase normally grants these via default privileges; making them explicit
-- avoids "permission denied for table" if that setup differs. RLS still governs
-- which rows each role can actually touch.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;

grant execute on function public.place_order(uuid, uuid, jsonb, text) to anon, authenticated;
grant execute on function public.request_bill(uuid) to anon, authenticated;
grant execute on function public.current_restaurant_id() to anon, authenticated;
grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.is_platform_admin() to anon, authenticated;

-- ============================================================================
-- DONE. Next steps (see README):
--   1. Enable "Anonymous sign-ins" in Auth settings (customers order without login).
--   2. Promote yourself to platform admin:
--        update public.profiles set role = 'platform_admin' where email = 'you@example.com';
-- ============================================================================
