'use client'
// Thin client wrapper — RecipeView needs client-side state
import { RecipeView } from './RecipeView'
import type { Recipe } from '@/types'

export function RecipeViewWrapper({ recipe }: { recipe: Recipe }) {
  return <RecipeView recipe={recipe} />
}
