-- Let owners arrange table tiles on the Floor view to match their real layout.
alter table public.tables
  add column if not exists position int not null default 0;

-- Seed positions from current creation order (per restaurant) so tiles start
-- in a sensible sequence.
with ranked as (
  select id, row_number() over (partition by restaurant_id order by created_at) - 1 as rn
  from public.tables
)
update public.tables t set position = r.rn from ranked r where r.id = t.id;
