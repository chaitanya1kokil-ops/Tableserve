-- ============================================================================
-- Let platform admins write restaurant images while impersonating a client.
--
-- The existing "images: tenant write/update/delete" policies scope uploads to
-- the caller's OWN restaurant folder (current_restaurant_id()). An admin has no
-- restaurant of their own, so without this they could open any dashboard but
-- couldn't upload a logo or menu photo. These add-on policies grant admins
-- write access to the whole bucket. Postgres ORs permissive policies together,
-- so tenants are unaffected.
-- ============================================================================

create policy "images: admin write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'restaurant-images' and public.is_platform_admin()
  );

create policy "images: admin update" on storage.objects
  for update to authenticated using (
    bucket_id = 'restaurant-images' and public.is_platform_admin()
  );

create policy "images: admin delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'restaurant-images' and public.is_platform_admin()
  );
