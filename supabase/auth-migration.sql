-- ============================================================
-- Auth Migration: Public read / Authenticated write
-- ============================================================
-- Run this in the Supabase SQL Editor.
-- Replaces the open "public_all" MVP policies with:
--   public_read  → anyone (including anon) can SELECT
--   owner_write  → INSERT / UPDATE / DELETE require a valid session
--
-- YOUR IMAGES ARE SAFE: this does not touch Storage files or URLs.
-- ============================================================

-- ---- RECIPES -----------------------------------------------
drop policy if exists "public_all" on recipes;

create policy "public_read"  on recipes
  for select using (true);

create policy "owner_write"  on recipes
  for insert with check (auth.uid() is not null);

create policy "owner_update" on recipes
  for update using (auth.uid() is not null);

create policy "owner_delete" on recipes
  for delete using (auth.uid() is not null);

-- ---- RECIPE INGREDIENTS ------------------------------------
drop policy if exists "public_all" on recipe_ingredients;

create policy "public_read"  on recipe_ingredients
  for select using (true);

create policy "owner_write"  on recipe_ingredients
  for insert with check (auth.uid() is not null);

create policy "owner_update" on recipe_ingredients
  for update using (auth.uid() is not null);

create policy "owner_delete" on recipe_ingredients
  for delete using (auth.uid() is not null);

-- ---- INGREDIENT SECTIONS -----------------------------------
drop policy if exists "public_all" on ingredient_sections;

create policy "public_read"  on ingredient_sections
  for select using (true);

create policy "owner_write"  on ingredient_sections
  for insert with check (auth.uid() is not null);

create policy "owner_update" on ingredient_sections
  for update using (auth.uid() is not null);

create policy "owner_delete" on ingredient_sections
  for delete using (auth.uid() is not null);

-- ---- METHOD STEPS ------------------------------------------
drop policy if exists "public_all" on method_steps;

create policy "public_read"  on method_steps
  for select using (true);

create policy "owner_write"  on method_steps
  for insert with check (auth.uid() is not null);

create policy "owner_update" on method_steps
  for update using (auth.uid() is not null);

create policy "owner_delete" on method_steps
  for delete using (auth.uid() is not null);

-- ---- RECIPE TAGS -------------------------------------------
drop policy if exists "public_all" on recipe_tags;

create policy "public_read"  on recipe_tags
  for select using (true);

create policy "owner_write"  on recipe_tags
  for insert with check (auth.uid() is not null);

create policy "owner_delete" on recipe_tags
  for delete using (auth.uid() is not null);

-- ---- FAVOURITES --------------------------------------------
drop policy if exists "public_all" on favourites;

create policy "public_read"  on favourites
  for select using (true);

create policy "owner_write"  on favourites
  for insert with check (auth.uid() is not null);

create policy "owner_update" on favourites
  for update using (auth.uid() is not null);

create policy "owner_delete" on favourites
  for delete using (auth.uid() is not null);

-- ---- INGREDIENTS -------------------------------------------
drop policy if exists "public_all" on ingredients;

create policy "public_read"  on ingredients
  for select using (true);

create policy "owner_write"  on ingredients
  for insert with check (auth.uid() is not null);

create policy "owner_update" on ingredients
  for update using (auth.uid() is not null);

create policy "owner_delete" on ingredients
  for delete using (auth.uid() is not null);

-- ---- CATEGORIES --------------------------------------------
drop policy if exists "public_all" on categories;

create policy "public_read"  on categories
  for select using (true);

create policy "owner_write"  on categories
  for insert with check (auth.uid() is not null);

create policy "owner_update" on categories
  for update using (auth.uid() is not null);

create policy "owner_delete" on categories
  for delete using (auth.uid() is not null);

-- ---- TAGS --------------------------------------------------
drop policy if exists "public_all" on tags;

create policy "public_read"  on tags
  for select using (true);

create policy "owner_write"  on tags
  for insert with check (auth.uid() is not null);

create policy "owner_update" on tags
  for update using (auth.uid() is not null);

create policy "owner_delete" on tags
  for delete using (auth.uid() is not null);

-- ---- STORAGE: recipe-images bucket -------------------------
-- Keeps existing images fully public (no URL changes).
-- Restricts new uploads to authenticated users.
-- The server-side import route uses the service role key,
-- so imports continue to work after this policy is applied.

insert into storage.buckets (id, name, public)
  values ('recipe-images', 'recipe-images', true)
  on conflict (id) do update set public = true;

drop policy if exists "public_read"   on storage.objects;
drop policy if exists "owner_upload"  on storage.objects;
drop policy if exists "owner_delete"  on storage.objects;

create policy "public_read" on storage.objects
  for select using (bucket_id = 'recipe-images');

create policy "owner_upload" on storage.objects
  for insert with check (
    bucket_id = 'recipe-images'
    and auth.uid() is not null
  );

create policy "owner_delete" on storage.objects
  for delete using (
    bucket_id = 'recipe-images'
    and auth.uid() is not null
  );
