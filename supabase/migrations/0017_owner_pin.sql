-- ============================================================================
-- Owner mode (staff vs owner on a shared device)
-- The restaurant runs on one login. Staff use it all shift for orders/kitchen/
-- checkout/menu/tables. The owner sets a 4–6 digit PIN and can "switch to owner"
-- to unlock revenue, analytics and reporting. This is a convenience lock on a
-- shared tablet (everyone is on the owner's account), not a hard auth boundary.
-- The PIN is stored as a bcrypt hash and verified server-side so the raw PIN is
-- never sent to the browser.
-- ============================================================================

create extension if not exists pgcrypto;

alter table public.restaurants
  add column if not exists owner_pin text; -- bcrypt hash, or null = no lock

-- Set or clear the owner PIN for the caller's restaurant. Empty clears it.
create or replace function public.set_owner_pin(p_pin text)
returns void
language plpgsql security invoker set search_path = public as $$
declare v_rid uuid := public.current_restaurant_id();
begin
  if v_rid is null then raise exception 'Not authorized'; end if;
  if coalesce(trim(p_pin), '') = '' then
    update public.restaurants set owner_pin = null where id = v_rid;
    return;
  end if;
  if p_pin !~ '^\d{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits.';
  end if;
  update public.restaurants
  set owner_pin = crypt(p_pin, gen_salt('bf'))
  where id = v_rid;
end;
$$;

-- Verify a PIN attempt for the caller's restaurant.
create or replace function public.verify_owner_pin(p_pin text)
returns boolean
language plpgsql security invoker set search_path = public as $$
declare v_hash text;
begin
  select owner_pin into v_hash from public.restaurants
  where id = public.current_restaurant_id();
  if v_hash is null then return true; end if; -- no lock set => always allowed
  return v_hash = crypt(coalesce(p_pin, ''), v_hash);
end;
$$;

grant execute on function public.set_owner_pin(text) to authenticated;
grant execute on function public.verify_owner_pin(text) to authenticated;
