-- A "counter" (a.k.a. register) QR: a takeout-only ordering point for the line
-- at the counter. Same tables row + QR mechanics as a dining table, but the
-- customer menu asks for a name and forces takeout when kind = 'counter'.
alter table public.tables
  add column if not exists kind text not null default 'table'
    check (kind in ('table', 'counter'));
