-- 2D positions (percentages of the floor canvas) so owners can drag tables into
-- a layout that matches their real room.
alter table public.tables
  add column if not exists pos_x real,
  add column if not exists pos_y real;

-- Seed a tidy 5-column grid for tables that don't have a position yet.
with ranked as (
  select id, row_number() over (partition by restaurant_id order by position, created_at) - 1 as rn
  from public.tables
)
update public.tables t
set pos_x = 10 + (r.rn % 5) * 19,
    pos_y = 12 + floor(r.rn / 5) * 20
from ranked r
where r.id = t.id and (t.pos_x is null or t.pos_y is null);
