-- ============================================================================
-- Contact form posts through /api/contact, not straight to the table
--
-- 0042 let anon insert directly, because the form wrote to Supabase from the
-- browser. It now posts to a serverless function that stores the message AND
-- emails it, using the service-role key — so the public needs no access to this
-- table at all.
--
-- Closing the direct path also means the hourly cap can't be sidestepped by
-- posting to PostgREST with the anon key instead of using the form.
-- ============================================================================

drop policy if exists "contact: anyone can send" on public.contact_messages;

revoke all on public.contact_messages from anon;

-- Platform admins still read and triage from the admin console.
grant select, update on public.contact_messages to authenticated;
