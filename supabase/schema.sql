-- ============================================================
-- Recipe Book — Supabase Schema
-- ============================================================
-- Designed for single-user MVP with clean multi-user upgrade path.
-- All tables include commented user_id columns for future auth.
-- Run this entire file in the Supabase SQL editor.
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint categories_name_key unique (name),
  constraint categories_slug_key unique (slug)
);

-- ============================================================
-- TAGS
-- ============================================================
create table if not exists tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  created_at timestamptz not null default now(),
  constraint tags_name_key unique (name),
  constraint tags_slug_key unique (slug)
);

-- ============================================================
-- INGREDIENT CATEGORIES
-- ============================================================
create table if not exists ingredient_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint ingredient_categories_name_key unique (name)
);

-- ============================================================
-- INGREDIENTS
-- ============================================================
create table if not exists ingredients (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category_id         uuid references ingredient_categories (id) on delete set null,
  default_unit        text,
  -- Conversion metadata (density mappings for g <-> cup/ml)
  density_g_per_cup   numeric,
  density_g_per_100ml numeric,
  notes               text,
  created_at          timestamptz not null default now(),
  constraint ingredients_name_key unique (name)
);

-- ============================================================
-- RECIPES
-- ============================================================
create table if not exists recipes (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  category_id    uuid references categories (id) on delete set null,
  hero_image_url text,
  servings       integer,
  prep_time_mins integer,
  cook_time_mins integer,
  source         text,      -- URL, book name, person, etc.
  notes          text,
  is_favourite   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
  -- future: user_id uuid references auth.users (id) on delete cascade
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_updated_at
  before update on recipes
  for each row execute procedure update_updated_at();

-- ============================================================
-- INGREDIENT SECTIONS (optional grouping within a recipe)
-- ============================================================
create table if not exists ingredient_sections (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes (id) on delete cascade,
  title         text,           -- e.g. "For the sauce", null = default section
  display_order integer not null default 0
);

-- ============================================================
-- RECIPE INGREDIENTS
-- ============================================================
create table if not exists recipe_ingredients (
  id              uuid primary key default gen_random_uuid(),
  recipe_id       uuid not null references recipes (id) on delete cascade,
  section_id      uuid references ingredient_sections (id) on delete set null,
  ingredient_id   uuid references ingredients (id) on delete set null,
  ingredient_name text not null,   -- denormalised for fast display
  quantity        numeric,
  unit            text,            -- g, ml, tsp, tbsp, cups, number, or custom
  preparation     text,            -- e.g. "finely chopped", "at room temperature"
  display_order   integer not null default 0
);

-- ============================================================
-- METHOD STEPS
-- ============================================================
create table if not exists method_steps (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references recipes (id) on delete cascade,
  step_number integer not null,
  instruction text not null
);

-- ============================================================
-- RECIPE TAGS
-- ============================================================
create table if not exists recipe_tags (
  recipe_id uuid not null references recipes (id) on delete cascade,
  tag_id    uuid not null references tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- ============================================================
-- FAVOURITES  (separate table for future per-user support)
-- ============================================================
-- NOTE: We also keep is_favourite on recipes for single-user
-- speed. This table is the canonical source for future multi-user.
create table if not exists favourites (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- future: user_id uuid references auth.users (id) on delete cascade,
  constraint favourites_recipe_unique unique (recipe_id)
  -- future constraint: unique (recipe_id, user_id)
);

-- ============================================================
-- EXTENSIONS (must come before indexes that depend on them)
-- ============================================================
create extension if not exists pg_trgm;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_recipes_category      on recipes (category_id);
create index if not exists idx_recipes_is_favourite  on recipes (is_favourite);
create index if not exists idx_recipe_ingredients_recipe on recipe_ingredients (recipe_id);
create index if not exists idx_method_steps_recipe   on method_steps (recipe_id, step_number);
create index if not exists idx_recipe_tags_recipe    on recipe_tags (recipe_id);
create index if not exists idx_recipe_tags_tag       on recipe_tags (tag_id);
create index if not exists idx_ingredients_name      on ingredients using gin (name gin_trgm_ops);

-- Full-text search index on recipes
alter table recipes add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(notes, ''))
  ) stored;

create index if not exists idx_recipes_search on recipes using gin (search_vector);

-- ============================================================
-- ROW LEVEL SECURITY (scaffolded for future auth)
-- ============================================================
alter table recipes           enable row level security;
alter table recipe_ingredients enable row level security;
alter table ingredient_sections enable row level security;
alter table method_steps       enable row level security;
alter table recipe_tags        enable row level security;
alter table favourites         enable row level security;
alter table ingredients        enable row level security;
alter table categories         enable row level security;
alter table tags               enable row level security;

-- MVP: open read/write for all (no auth). Replace with user-scoped policies when auth is added.
create policy "public_all" on recipes            for all using (true) with check (true);
create policy "public_all" on recipe_ingredients for all using (true) with check (true);
create policy "public_all" on ingredient_sections for all using (true) with check (true);
create policy "public_all" on method_steps       for all using (true) with check (true);
create policy "public_all" on recipe_tags        for all using (true) with check (true);
create policy "public_all" on favourites         for all using (true) with check (true);
create policy "public_all" on ingredients        for all using (true) with check (true);
create policy "public_all" on categories         for all using (true) with check (true);
create policy "public_all" on tags               for all using (true) with check (true);
