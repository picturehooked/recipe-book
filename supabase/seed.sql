-- ============================================================
-- Seed data — run AFTER schema.sql
-- ============================================================

-- ============================================================
-- RECIPE CATEGORIES
-- ============================================================
insert into categories (name, slug, sort_order) values
  ('Starters',  'starters',  1),
  ('Pasta',     'pasta',     2),
  ('Chicken',   'chicken',   3),
  ('Beef',      'beef',      4),
  ('Lamb',      'lamb',      5),
  ('Fish',      'fish',      6),
  ('Desserts',  'desserts',  7),
  ('Bread',     'bread',     8),
  ('Biscuits',  'biscuits',  9)
on conflict (slug) do nothing;

-- ============================================================
-- INGREDIENT CATEGORIES
-- ============================================================
insert into ingredient_categories (name, sort_order) values
  ('Herbs & Spices',               1),
  ('Oils, Sauces & Condiments',    2),
  ('Meat & Fish',                  3),
  ('Dairy & Eggs',                 4),
  ('Fresh Fruit & Vegetables',     5),
  ('Baking',                       6),
  ('Pasta, Rice & Grains',         7),
  ('Tinned / Jarred / Pantry Goods', 8)
on conflict (name) do nothing;

-- ============================================================
-- INGREDIENTS
-- NOTE: density_g_per_cup values are UK standard weights.
-- Each insert looks up its category directly.
-- ============================================================

-- Herbs & Spices
insert into ingredients (name, category_id, default_unit) select 'Basil',           (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Bay leaves',       (select id from ingredient_categories where name = 'Herbs & Spices'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Cayenne',          (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Chilli flakes',    (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Chilli powder',    (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Cumin seeds',      (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Dill',             (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Fresh chilli',     (select id from ingredient_categories where name = 'Herbs & Spices'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Fresh coriander',  (select id from ingredient_categories where name = 'Herbs & Spices'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Fresh parsley',    (select id from ingredient_categories where name = 'Herbs & Spices'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Ginger',           (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Ground coriander', (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Ground cumin',     (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Mixed herbs',      (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Oregano',          (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Paprika',          (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Pepper',           (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Rosemary',         (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Saffron',          (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Salt',             (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Sesame seeds',     (select id from ingredient_categories where name = 'Herbs & Spices'), 'tbsp'   on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Thyme',            (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Vanilla',          (select id from ingredient_categories where name = 'Herbs & Spices'), 'tsp'    on conflict (name) do nothing;

-- Oils, Sauces & Condiments
insert into ingredients (name, category_id, default_unit) select 'Balsamic vinegar', (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'tbsp' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Beef stock',       (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'ml'   on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Chicken stock',    (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'ml'   on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Dijon mustard',    (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'tsp'  on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Honey',            (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'tbsp' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Lemon juice',      (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'tbsp' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Lemon zest',       (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'tsp'  on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Olive oil',        (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'tbsp' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Sesame oil',       (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'tbsp' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Soy sauce',        (select id from ingredient_categories where name = 'Oils, Sauces & Condiments'), 'tbsp' on conflict (name) do nothing;

-- Meat & Fish
insert into ingredients (name, category_id, default_unit) select 'Anchovies',             (select id from ingredient_categories where name = 'Meat & Fish'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Chicken breast cubed',  (select id from ingredient_categories where name = 'Meat & Fish'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Chicken breast whole',  (select id from ingredient_categories where name = 'Meat & Fish'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Ground veal',           (select id from ingredient_categories where name = 'Meat & Fish'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Lamb leg steaks',       (select id from ingredient_categories where name = 'Meat & Fish'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Lamb shoulder',         (select id from ingredient_categories where name = 'Meat & Fish'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Minced beef',           (select id from ingredient_categories where name = 'Meat & Fish'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Minced chicken breast', (select id from ingredient_categories where name = 'Meat & Fish'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Minced lamb',           (select id from ingredient_categories where name = 'Meat & Fish'), 'g'      on conflict (name) do nothing;

-- Dairy & Eggs
insert into ingredients (name, category_id, default_unit) select 'Butter',          (select id from ingredient_categories where name = 'Dairy & Eggs'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Buttermilk',      (select id from ingredient_categories where name = 'Dairy & Eggs'), 'ml'     on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Crème fraiche',   (select id from ingredient_categories where name = 'Dairy & Eggs'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Eggs',            (select id from ingredient_categories where name = 'Dairy & Eggs'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Egg whites',      (select id from ingredient_categories where name = 'Dairy & Eggs'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Egg yolks',       (select id from ingredient_categories where name = 'Dairy & Eggs'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Grated cheddar',  (select id from ingredient_categories where name = 'Dairy & Eggs'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Milk',            (select id from ingredient_categories where name = 'Dairy & Eggs'), 'ml'     on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Mozzarella',      (select id from ingredient_categories where name = 'Dairy & Eggs'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Parmesan cheese', (select id from ingredient_categories where name = 'Dairy & Eggs'), 'g'      on conflict (name) do nothing;

-- Fresh Fruit & Vegetables
insert into ingredients (name, category_id, default_unit) select 'Asparagus',       (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Avocado',         (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Broccoli',        (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Button mushrooms',(select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Cauliflower',     (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Celery',          (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Chopped tomatoes',(select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Courgette',       (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Cucumber',        (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Fresh tomatoes',  (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Garlic cloves',   (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Green beans',     (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Onion',           (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Red pepper',      (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Rocket',          (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Spring onions',   (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Sweet potato',    (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'number' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Sweetcorn',       (select id from ingredient_categories where name = 'Fresh Fruit & Vegetables'), 'g'      on conflict (name) do nothing;

-- Baking (with density mappings)
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Baking powder',       (select id from ingredient_categories where name = 'Baking'), 'tsp', null on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Bicarbonate of soda', (select id from ingredient_categories where name = 'Baking'), 'tsp', null on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Caster sugar',        (select id from ingredient_categories where name = 'Baking'), 'g',   200  on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Dried yeast',         (select id from ingredient_categories where name = 'Baking'), 'tsp', null on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Icing sugar',         (select id from ingredient_categories where name = 'Baking'), 'g',   120  on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Plain flour',         (select id from ingredient_categories where name = 'Baking'), 'g',   120  on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Self-raising flour',  (select id from ingredient_categories where name = 'Baking'), 'g',   120  on conflict (name) do nothing;

-- Pasta, Rice & Grains
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Arborio rice',      (select id from ingredient_categories where name = 'Pasta, Rice & Grains'), 'g', 210 on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Basmati rice',      (select id from ingredient_categories where name = 'Pasta, Rice & Grains'), 'g', 185 on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit)                    select 'Fettuccine',        (select id from ingredient_categories where name = 'Pasta, Rice & Grains'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit)                    select 'Macaroni',          (select id from ingredient_categories where name = 'Pasta, Rice & Grains'), 'g'      on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit, density_g_per_cup) select 'Oats',              (select id from ingredient_categories where name = 'Pasta, Rice & Grains'), 'g', 90  on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit)                    select 'Panko breadcrumbs', (select id from ingredient_categories where name = 'Pasta, Rice & Grains'), 'g'      on conflict (name) do nothing;

-- Tinned / Jarred / Pantry Goods
insert into ingredients (name, category_id, default_unit) select 'Coconut milk',   (select id from ingredient_categories where name = 'Tinned / Jarred / Pantry Goods'), 'ml'   on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Coconut oil',    (select id from ingredient_categories where name = 'Tinned / Jarred / Pantry Goods'), 'tbsp' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Olives',         (select id from ingredient_categories where name = 'Tinned / Jarred / Pantry Goods'), 'g'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Pine nuts',      (select id from ingredient_categories where name = 'Tinned / Jarred / Pantry Goods'), 'g'    on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Tomato passata', (select id from ingredient_categories where name = 'Tinned / Jarred / Pantry Goods'), 'ml'   on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Tomato puree',   (select id from ingredient_categories where name = 'Tinned / Jarred / Pantry Goods'), 'tbsp' on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'White wine',     (select id from ingredient_categories where name = 'Tinned / Jarred / Pantry Goods'), 'ml'   on conflict (name) do nothing;
insert into ingredients (name, category_id, default_unit) select 'Red wine',       (select id from ingredient_categories where name = 'Tinned / Jarred / Pantry Goods'), 'ml'   on conflict (name) do nothing;

-- ============================================================
-- DEFAULT TAGS
-- ============================================================
insert into tags (name, slug) values
  ('Quick',       'quick'),
  ('Easy',        'easy'),
  ('Make ahead',  'make-ahead'),
  ('Freezable',   'freezable'),
  ('Gluten-free', 'gluten-free'),
  ('Dairy-free',  'dairy-free'),
  ('Vegetarian',  'vegetarian'),
  ('Vegan',       'vegan'),
  ('One pot',     'one-pot'),
  ('Weekend',     'weekend')
on conflict (slug) do nothing;
