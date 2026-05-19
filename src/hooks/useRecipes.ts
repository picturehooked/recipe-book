'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RecipeSummary, Recipe } from '@/types'

const RECIPE_CARD_FIELDS = `
  id, title, category_id, hero_image_url,
  servings, prep_time_mins, cook_time_mins,
  is_favourite, created_at,
  category:categories(id, name, slug, sort_order),
  tags:recipe_tags(tag:tags(id, name, slug))
`

const RECIPE_FULL_FIELDS = `
  *,
  category:categories(*),
  tags:recipe_tags(tag:tags(*)),
  ingredient_sections(*),
  recipe_ingredients(*),
  method_steps(*)
`

export function useRecipes() {
  const [recipes, setRecipes]   = useState<RecipeSummary[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const supabase = createClient()

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('recipes')
        .select(RECIPE_CARD_FIELDS)
        .order('created_at', { ascending: false })

      if (err) throw err
      // Flatten nested tag join
      const normalised = (data ?? []).map((r: any) => ({
        ...r,
        tags: r.tags?.map((rt: any) => rt.tag).filter(Boolean) ?? [],
      }))
      setRecipes(normalised)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load recipes')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  return { recipes, loading, error, refetch: fetchRecipes }
}

export function useRecipe(id: string) {
  const [recipe,  setRecipe]  = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function fetch() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('recipes')
          .select(RECIPE_FULL_FIELDS)
          .eq('id', id)
          .single()

        if (err) throw err
        if (cancelled) return

        const normalised = {
          ...data,
          tags:                data.tags?.map((rt: any) => rt.tag).filter(Boolean) ?? [],
          ingredient_sections: data.ingredient_sections?.sort((a: any, b: any) => a.display_order - b.display_order) ?? [],
          recipe_ingredients:  data.recipe_ingredients?.sort((a: any, b: any) => a.display_order - b.display_order) ?? [],
          method_steps:        data.method_steps?.sort((a: any, b: any) => a.step_number - b.step_number) ?? [],
        }
        setRecipe(normalised)
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load recipe')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [id, supabase])

  return { recipe, loading, error }
}

export function useToggleFavourite() {
  const supabase = createClient()

  return useCallback(async (recipeId: string, currentState: boolean): Promise<boolean> => {
    const { error } = await supabase
      .from('recipes')
      .update({ is_favourite: !currentState })
      .eq('id', recipeId)

    if (error) throw error
    return !currentState
  }, [supabase])
}

export function useDeleteRecipe() {
  const supabase = createClient()

  return useCallback(async (recipeId: string): Promise<void> => {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)

    if (error) throw error
  }, [supabase])
}
