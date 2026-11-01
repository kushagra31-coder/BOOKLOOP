-- ==============================================================================
-- Migration: 0004_storage.sql
-- Description: Create 'listing-images' bucket and RLS policies for storage.objects
-- ==============================================================================

-- 1. CREATE OR UPDATE 'listing-images' BUCKET
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  2097152, -- 2MB file size limit
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- 2. POLICIES ON storage.objects

-- A. Public Read: Any visitor or user can read photos in 'listing-images'
drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read"
on storage.objects
for select
to public, anon, authenticated
using (bucket_id = 'listing-images');

-- B. Insert: Authenticated users can only upload files into their own folder ({uid}/*)
drop policy if exists "listing_images_auth_insert_own_folder" on storage.objects;
create policy "listing_images_auth_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- C. Delete: Authenticated users can only delete files in their own folder ({uid}/*)
drop policy if exists "listing_images_auth_delete_own_folder" on storage.objects;
create policy "listing_images_auth_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Note: No UPDATE policy is created as uploaded book photos are immutable.
-- Object names follow the pattern: {uid}/{crypto.randomUUID()}.{ext}
