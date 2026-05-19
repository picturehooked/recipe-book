// ============================================================
// Core domain types
// ============================================================

export type Unit = 'g' | 'ml' | 'tsp' | 'tbsp' | 'cups' | 'number' | string

export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
  created_at: string
}

export interface Tag {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface IngredientCategory {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Ingredient {
  id: string
  name: string
  category_id: string | null
  default_unit: Unit | null
  density_g_per_cup: number | null
  density_g_per_100ml: number | null
  notes: string | null
  created_at: string
  // joined
  ingredient_category?: IngredientCategory
}

export interface IngredientSection {
  id: string
  recipe_id: string
  title: string | null
  display_order: number
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  section_id: string | null
  ingredient_id: string | null
  ingredient_name: string
  quantity: number | null
  unit: Unit | null
  preparation: string | null
  display_order: number
}

export interface MethodStep {
  id: string
  recipe_id: string
  step_number: number
  instruction: string
}

export interface Recipe {
  id: string
  title: string
  category_id: string | null
  hero_image_url: string | null
  servings: number | null
  prep_time_mins: number | null
  cook_time_mins: number | null
  source: string | null
  notes: string | null
  is_favourite: boolean
  created_at: string
  updated_at: string
  // joined
  category?: Category
  tags?: Tag[]
  ingredient_sections?: IngredientSection[]
  recipe_ingredients?: RecipeIngredient[]
  method_steps?: MethodStep[]
}

// Lightweight card variant for browse/grid display
export interface RecipeSummary {
  id: string
  title: string
  category_id: string | null
  hero_image_url: string | null
  servings: number | null
  prep_time_mins: number | null
  cook_time_mins: number | null
  is_favourite: boolean
  created_at: string
  category?: Category
  tags?: Tag[]
}

// ============================================================
// Form types
// ============================================================

export interface RecipeIngredientInput {
  id?: string
  ingredient_name: string
  quantity: string  // string during editing, parsed before save
  unit: Unit | ''
  preparation: string
  display_order: number
}

export interface IngredientSectionInput {
  id?: string
  title: string
  display_order: number
  ingredients: RecipeIngredientInput[]
}

export interface RecipeFormValues {
  title: string
  category_id: string
  tag_ids: string[]
  servings: string
  prep_time_mins: string
  cook_time_mins: string
  source: string
  notes: string
  hero_image_url: string
  hero_image_file: File | null
  sections: IngredientSectionInput[]
  method_steps: string[]  // plain text, indexed by step
}

// ============================================================
// Import types
// ============================================================

export type ImportMethod = 'url' | 'photo' | 'pdf' | 'manual'

export interface ImportedRecipe {
  title: string
  category_id?: string
  servings?: number
  source?: string
  hero_image_url?: string
  sections: IngredientSectionInput[]
  method_steps: string[]
  raw_text?: string  // retained for manual correction
}

export interface ImportResult {
  success: boolean
  recipe?: ImportedRecipe
  error?: string
  warning?: string
}

// ============================================================
// Search & filter types
// ============================================================

export interface FilterState {
  query: string
  category_ids: string[]
  tag_ids: string[]
  favourites_only: boolean
}

// ============================================================
// Conversion types
// ============================================================

export interface ConversionResult {
  value: number
  unit: Unit
  display: string
}

export interface UKConversionMap {
  ingredientName: string
  gPerCup?: number
  gPerTbsp?: number
  gPerTsp?: number
}
