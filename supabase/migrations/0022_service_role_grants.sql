-- service_role had NO table grants in this project (stripped during earlier RLS
-- hardening), so any server-side code using the service-role key — the Stripe
-- webhook and create-checkout functions — failed with "permission denied for
-- table". Restore the standard Supabase service_role privileges. service_role
-- bypasses RLS and is only ever used server-side with the secret key, so full
-- access is correct and expected.

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
