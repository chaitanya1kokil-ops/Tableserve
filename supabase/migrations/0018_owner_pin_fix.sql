-- ============================================================================
-- Fix: setting the owner PIN errored because pgcrypto (crypt/gen_salt) lives in
-- the `extensions` schema, but the functions searched only `public`. Add
-- `extensions` to the search_path.
-- ============================================================================

create or replace function public.set_owner_pin(p_pin text)
returns void
language plpgsql security invoker set search_path = public, extensions as $$
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

create or replace function public.verify_owner_pin(p_pin text)
returns boolean
language plpgsql security invoker set search_path = public, extensions as $$
declare v_hash text;
begin
  select owner_pin into v_hash from public.restaurants
  where id = public.current_restaurant_id();
  if v_hash is null then return true; end if;
  return v_hash = crypt(coalesce(p_pin, ''), v_hash);
end;
$$;
