'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ingredient } from '@/types'

export function useIngredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    supabase
      .from('ingredients')
      .select('*, ingredient_category:ingredient_categories(id, name, sort_order)')
      .order('name')
      .then(({ data }) => {
        if (!cancelled) {
          setIngredients(data ?? [])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [supabase])

  /** Fuzzy search ingredients by name */
  const search = useCallback(
    (query: string): Ingredient[] => {
      if (!query.trim()) return ingredients.slice(0, 20)
      const q = query.toLowerCase()
      return ingredients
        .filter((i) => i.name.toLowerCase().includes(q))
        .slice(0, 12)
    },
    [ingredients]
  )

  /** Add a new ingredient if it doesn't already exist. Returns the ingredient. */
  const getOrCreate = useCallback(
    async (name: string): Promise<Ingredient | null> => {
      const existing = ingredients.find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      )
      if (existing) return existing

      const { data, error } = await supabase
        .from('ingredients')
        .insert({ name: name.trim() })
        .select('*')
        .single()

      if (error) {
        console.error('Failed to create ingredient:', error)
        return null
      }

      setIngredients((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return data
    },
    [ingredients, supabase]
  )

  return { ingredients, loading, search, getOrCreate }
}
