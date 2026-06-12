# Recipe Book — Setup Guide

## Prerequisites

- Node.js 20+
- A Supabase account (free tier is sufficient)
- A GitHub account
- A Vercel account

---

## 1. Supabase Setup

### Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon key** (Settings → API)

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

## 4. Vercel Deployment

1. Go to [vercel.com](https://vercel.com) → **Add New Project → Import Git Repository**
2. Select your GitHub repo
3. Framework is auto-detected as Next.js — leave build settings as default
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**

Vercel auto-deploys on every push to `main`.

---

## 5. Image Optimisation

The app uses Next.js `next/image` for all recipe images. To avoid hitting Vercel's Image
Optimization transformation limits, two rules are in place:

**Images are uploaded to Supabase Storage on import.** When a recipe is imported via URL,
the import route (`/api/import/url`) downloads the external image and uploads it to the
`recipe-images` Supabase Storage bucket before saving the recipe. The Supabase URL is stored,
not the original external URL. This means `next/image` only ever serves images from Supabase,
not from external domains.

**Cache TTL is set to 30 days.** `next.config.js` sets `minimumCacheTTL: 2592000`. Each
unique image is transformed once (per size/format variant) and cached for 30 days. Do not
reduce this value without understanding the transformation cost implications.

The only permitted remote pattern in `next.config.js` is `**.supabase.co`. Do not add
external image domains (BBC Good Food, Unsplash, etc.) — doing so would route external images
through Vercel's transformation pipeline on every page load.

---

## 6. Supabase Auth (Future)

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

## 7. Adding an OpenAI Key (Optional)

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
│       ├── import/url/       # URL recipe scraping + image upload
│       └── ingredients/      # Ingredient CRUD
├── components/
│   ├── browse/               # Browse page
│   ├── export/               # PDF cookbook and menu export
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

**Why upload images to Supabase Storage on import rather than storing external URLs?**
Storing external URLs (e.g. from BBC Good Food) causes every recipe card render to trigger a
Vercel Image Optimization transformation for that URL. With six device sizes and two formats
(avif + webp), a single external image can generate up to 12 transformation variants per cache
expiry cycle. Uploading to Supabase Storage on import means all images are served from a
single trusted domain, transformations are cached for 30 days, and external domains do not
need to be whitelisted in `next.config.js`.

**Why does PDF export bypass Vercel image optimisation?** The export components
(`RecipeBookPDF`, `ExportPDFButton`) use `@react-pdf/renderer`, which fetches images directly
from Supabase Storage via `fetch()` in the browser. The `next/image` pipeline is never
involved, so PDF generation does not consume image transformation quota regardless of how many
recipes are exported.
