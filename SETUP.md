# Recipe Book — Setup Guide

## Prerequisites

- Node.js 20+
- A Supabase account (free tier is sufficient)
- A GitHub account
- A Netlify account

---

## 1. Supabase Setup

### Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon key** (Settings → API)
https://gvdstvtnekuqdumirttz.supabase.co / sb_publishable_uRUCN9fy_jfkMhyiG-CCug_7SRVnfWh

### Run the schema

In the Supabase SQL editor, run the contents of `supabase/schema.sql` in full.

### Seed the database

In the Supabase SQL editor, run the contents of `supabase/seed.sql` in full.
This populates all recipe categories, ingredient categories, and the full ingredient database.

### Create the image storage bucket

In Supabase Storage, create a new bucket called **`recipe-images`**.
Set it to **Public**.

Under Storage → Policies, add a policy to allow all operations (for single-user MVP):
```sql
create policy "Public bucket" on storage.objects
  for all using (bucket_id = 'recipe-images') with check (bucket_id = 'recipe-images');
```

---

## 2. Local Development

```bash
# Clone your repo (after pushing to GitHub)
git clone https://github.com/your-username/recipe-book.git
cd recipe-book

# Install dependencies
npm install

# Copy the environment template
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

```bash
# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 3. GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/recipe-book.git
git push -u origin main
```

---

## 4. Netlify Deployment

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Select your GitHub repo
3. Build settings are auto-detected from `netlify.toml`
4. Under **Site configuration → Environment variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**

Install the Netlify Next.js plugin if prompted:
```bash
npm install @netlify/plugin-nextjs --save-dev
```

---

## 5. Supabase Auth (Future)

The database is architected for multi-user support. When you're ready to add authentication:

1. Enable Supabase Auth in your project settings
2. Add `user_id` columns to `recipes` and `favourites` (commented stubs are in the schema)
3. Replace the MVP RLS policies (`public_all`) with user-scoped policies:
   ```sql
   create policy "User owns recipe" on recipes
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
4. Add Supabase Auth UI components or use `@supabase/auth-ui-react`

---

## 6. Adding an OpenAI Key (Optional)

If you add `OPENAI_API_KEY` to your environment variables, the URL import route at
`/api/import/url` can be enhanced to use GPT-4o Vision for better structured extraction
from complex recipe pages. The architecture supports this without restructuring.

---

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── page.tsx              # Browse / home
│   ├── recipes/[id]/         # Recipe view
│   ├── recipes/[id]/edit/    # Edit recipe
│   ├── recipes/new/          # Create recipe
│   ├── import/               # Import workflow
│   └── api/                  # API routes
│       ├── import/url/       # URL recipe scraping
│       └── ingredients/      # Ingredient CRUD
├── components/
│   ├── browse/               # Browse page
│   ├── layout/               # Header, ThemeProvider
│   ├── recipe/               # Card, Grid, View, Form
│   ├── search/               # SearchBar, FilterPanel
│   ├── import/               # URLImport, PhotoImport, PDFImport
│   └── ui/                   # Button, Input, Badge, etc.
├── hooks/                    # useRecipes, useIngredients, useSearch
├── lib/
│   ├── supabase/             # Client + server Supabase clients
│   └── utils/                # Conversions, formatters, OCR parser
├── store/                    # Zustand filter state
└── types/                    # TypeScript types
supabase/
├── schema.sql                # Full database schema
└── seed.sql                  # Categories + all ingredients
```

---

## Key Decisions

**Why Zustand for filter state?** Filter state (search query, active categories, tags) is
client-side UI state that doesn't need server persistence. Zustand is lightweight and avoids
prop-drilling across the browse page.

**Why denormalise `ingredient_name` on `recipe_ingredients`?** This allows fast recipe display
without joining the ingredients table on every load. The `ingredient_id` foreign key is still
maintained for future analytics and ingredient-based search.

**Why `is_favourite` on the `recipes` table AND a separate `favourites` table?** The column
provides single-query access for the single-user MVP. The `favourites` table provides the
correct relational structure for per-user favourites when auth is added.

**Why on-device OCR?** Tesseract.js runs entirely in the browser. No images are transmitted
to third parties for OCR. This is faster for single-page recipes, respects privacy, and avoids
API costs. For lower-quality handwritten recipes, a future OpenAI Vision endpoint can be wired
in as a fallback via the existing `/api/import/url` pattern.
