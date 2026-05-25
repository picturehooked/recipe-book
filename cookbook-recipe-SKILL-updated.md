---
name: cookbook-recipe
description: >
  Use this skill whenever the user asks to summarise, format, or produce a recipe
  card in the style of a cookbook publisher. Triggers include any request to
  convert a recipe from an uploaded PDF or Word document into the standard
  template, adapt a recipe (e.g. change protein type), or add a recipe to the
  collection. Always use this skill when a recipe file is uploaded or when the
  user says "do the recipe for X".
---

# Cookbook Recipe Formatting Skill

## Purpose

Extract, format, and save recipes directly to the Recipe Drawer webapp database
(Supabase). Each recipe is structured into the webapp's schema: title, ingredient
sections, method steps (4–8), metric measurements, and source attribution.

---

## Template Specification

| Element | Format |
|---|---|
| **Title** | Preserved exactly as found in the source |
| **Ingredients** | Grouped into sections where the source uses them |
| **Serves** | Integer; extract if present |
| **Ingredient quantities** | All metric — convert imperial on extraction |
| **Method steps** | 4–8 steps maximum; consolidate closely related actions |
| **Source** | URL or attribution line from the source document |

**Measurements — convert on extraction:**
- Cups (wet) → ml (1 cup = 240 ml)
- Cups (dry) → g (ingredient-specific: 1 cup flour = 120 g, 1 cup sugar = 200 g)
- Tablespoons → tbsp (or ml if > 3 tbsp)
- Fahrenheit → Celsius

---

## Source Material Rules

**CRITICAL:** Never substitute, reconstruct from memory, or use a different recipe
as a proxy for the requested one. If the source is inaccessible, stop and ask the
user to upload it.

### Access priority order:

1. **PDF uploaded** → extract text using the pdf skill. Use the rasterise approach
   for layout-heavy or scanned pages.
2. **Word document (.docx) uploaded** → extract text using mammoth or the docx
   skill. Read all paragraphs in order.
3. **Recipe already in plain text** → use directly.
4. **URL provided** → fetch with `web_fetch`. If blocked, ask the user to upload
   the file instead. Do not proceed until content is received.

---

## Adaptations

When the user requests a modification (e.g. "change to ground meat", "make it
vegetarian"):

- Apply only the requested change — do not alter other ingredients or method steps.
- Note the adaptation if it affects cooking time or technique.
- Do not invent substitutions beyond what the user has specified.

---

## Method Step Consolidation

- Target: 4–8 numbered steps.
- Combine closely related actions (e.g. "season and toss" can be one step).
- Never split a single action across multiple steps.
- Never add steps not present in the source.
- If the source has fewer than 4 steps, keep them as-is.

---

## Multi-Recipe Files

When a file contains multiple recipes (common with pasted or compiled documents),
use these boundary rules to split the text before processing. Rules in priority order:

1. **`---` separator** — an explicit divider line ends the current recipe.
2. **Source line** — a `Source:` label, bare URL, or `www.` line ends the current
   recipe. The source line belongs to the recipe above it (include it before splitting).
3. **Method → Ingredients transition** — if a method section has already been seen
   and a new `Ingredients` heading appears, that heading opens the next recipe.

These rules mirror the boundary logic in `parse_recipes.cjs` and
`src/lib/utils/ocr-parser.ts`. After splitting, process each recipe independently
using the rules above and save all in sequence, confirming each save.

---

## Output — Save to Supabase

Do NOT produce a Word document. Instead, save each recipe directly to the webapp
database using the Supabase client.

### Step-by-step:

1. Read the Supabase credentials from the project's `.env.local` file at:
   /Users/charlesfellowes/Documents/Claude/Projects/Recipe App/.env.local
   Variables needed: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   (or SUPABASE_SERVICE_ROLE_KEY if available for elevated permissions).

2. Construct the recipe payload matching the webapp schema:

```json
{
  "title": "Recipe Title",
  "source": "https://source-url.com or attribution string",
  "servings": 4,
  "hero_image_url": null
}
```

3. Insert into `recipes` table; capture the returned `id`.

4. For each ingredient section, insert into `ingredient_sections`:
```json
{ "recipe_id": "<id>", "title": null, "display_order": 0 }
```

5. For each ingredient, insert into `recipe_ingredients`:
```json
{
  "recipe_id": "<id>",
  "section_id": "<section_id>",
  "ingredient_name": "Chicken breast",
  "quantity": 450,
  "unit": "g",
  "preparation": "minced",
  "display_order": 0
}
```

6. For each method step, insert into `method_steps`:
```json
{
  "recipe_id": "<id>",
  "step_number": 1,
  "instruction": "Heat oil in a large skillet over high heat."
}
```

7. Confirm each recipe was saved by printing the recipe title and its new ID.

### Python script approach

Write and run a Python script using the supabase-py library:

```python
import os

# Load .env.local manually
env_path = "/Users/charlesfellowes/Documents/Claude/Projects/Recipe App/.env.local"
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

from supabase import create_client
url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
sb  = create_client(url, key)

# Insert recipe, sections, ingredients, and steps as above
```

Install supabase-py if needed: pip install supabase --break-system-packages

---

## Workflow Checklist

1. Confirm source is accessible or uploaded.
2. Extract full text from the file.
3. Detect number of recipes; split if multiple (URL lines mark boundaries).
4. For each recipe:
   a. Extract title, source URL, and serves count.
   b. Convert all measurements to metric.
   c. Consolidate method to 4–8 steps.
   d. Apply any user-requested adaptations.
   e. Save to Supabase using the schema above.
   f. Confirm save with title and ID.
5. Report total recipes saved.

---

## Clarification Questions (ask before starting if unknown)

- Is there a specific adaptation requested (e.g. protein swap, dietary change)?
- Any changes to serves count?

Do not ask questions already answered in the conversation.
