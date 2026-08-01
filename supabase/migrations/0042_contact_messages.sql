-- ============================================================================
-- "Contact us" from the landing page
--
-- There is no email service wired into this deployment, so messages are stored
-- and read from the admin console rather than sent anywhere. That also means a
-- message can't be lost to a spam folder or a bounced API key.
--
-- Anyone may write (the form is public and visitors aren't signed in) but only
-- platform admins may read. Nobody can read their own message back — a public
-- select policy would expose every enquiry to anyone with the anon key.
-- ============================================================================

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  message    text not null check (length(btrim(message)) between 1 and 4000),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_new
  on public.contact_messages (created_at desc) where handled_at is null;

alter table public.contact_messages enable row level security;

-- Write-only for the public: the form posts, and that is all it can do.
drop policy if exists "contact: anyone can send" on public.contact_messages;
create policy "contact: anyone can send" on public.contact_messages
  for insert with check (true);

drop policy if exists "contact: admins read" on public.contact_messages;
create policy "contact: admins read" on public.contact_messages
  for select using (public.is_platform_admin());

drop policy if exists "contact: admins update" on public.contact_messages;
create policy "contact: admins update" on public.contact_messages
  for update using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Supabase's default privileges hand every new table in `public` to anon and
-- authenticated, so the narrow grants below are not enough on their own — the
-- inherited SELECT has to be taken away explicitly. RLS already blocks anon
-- reads, but the grant should not contradict the intent: enquiries contain
-- names, addresses and message bodies, and the anon key is public.
revoke all on public.contact_messages from anon;
grant insert on public.contact_messages to anon;
grant insert, select, update on public.contact_messages to authenticated;

-- Light flood guard: one sender can't queue more than 5 messages an hour.
-- Cheap to evaluate and enough to stop a bored script without a captcha.
create or replace function public.contact_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (
    select count(*) from public.contact_messages
    where lower(email) = lower(new.email)
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many messages from this address — please try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contact_rate_limit on public.contact_messages;
create trigger trg_contact_rate_limit
  before insert on public.contact_messages
  for each row execute function public.contact_rate_limit();
