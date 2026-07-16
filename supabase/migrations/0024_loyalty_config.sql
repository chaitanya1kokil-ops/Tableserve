-- Make the loyalty program self-serve: configurable reward text and threshold
-- (previously hardcoded to "every 10 visits = a free item"). loyalty_brand
-- being set = the program is enabled (unchanged). loyalty_summary now reads the
-- per-restaurant threshold/reward, and apply_loyalty honours the min-spend.

alter table public.restaurants
  add column if not exists loyalty_reward_every int default 10,
  add column if not exists loyalty_reward text;

create or replace function public.loyalty_summary(m loyalty_members)
returns json language sql stable as $$
  select json_build_object(
    'id', m.id,
    'name', split_part(coalesce(m.name, ''), ' ', 1),
    'email', m.email,
    'visits', m.visits,
    'reward_every', coalesce(nullif((select loyalty_reward_every from public.restaurants where id = m.restaurant_id), 0), 10),
    'reward', coalesce((select loyalty_reward from public.restaurants where id = m.restaurant_id), 'a free item'),
    'rewards_available', greatest(
      floor(m.visits::numeric / coalesce(nullif((select loyalty_reward_every from public.restaurants where id = m.restaurant_id), 0), 10))::int
      - m.rewards_redeemed, 0)
  );
$$;

create or replace function public.apply_loyalty(p_member uuid, p_order uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_order  public.orders%rowtype;
  v_member public.loyalty_members%rowtype;
  v_min    numeric;
begin
  select * into v_order from public.orders
  where id = p_order and customer_id = auth.uid() and loyalty_member_id is null;
  if not found then return; end if;

  select * into v_member from public.loyalty_members
  where id = p_member and restaurant_id = v_order.restaurant_id;
  if not found then return; end if;

  update public.orders set loyalty_member_id = p_member where id = p_order;

  select coalesce(loyalty_min_spend, 0) into v_min from public.restaurants where id = v_order.restaurant_id;

  -- One visit per sitting (>3h since last), only if the order meets min spend.
  if coalesce(v_order.total, 0) >= coalesce(v_min, 0)
     and (v_member.last_visit_at is null or v_member.last_visit_at < now() - interval '3 hours') then
    update public.loyalty_members set visits = visits + 1, last_visit_at = now() where id = p_member;
  end if;
end;
$$;

-- Seed sensible defaults for any restaurant that already had loyalty on.
update public.restaurants
set loyalty_reward = coalesce(loyalty_reward, 'A free item'),
    loyalty_reward_every = coalesce(loyalty_reward_every, 10)
where loyalty_brand is not null;
