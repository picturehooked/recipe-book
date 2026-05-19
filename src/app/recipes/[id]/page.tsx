import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecipeViewWrapper } from '@/components/recipe/RecipeViewWrapper'
import type { Metadata } from 'next'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('recipes')
    .select('title')
    .eq('id', params.id)
    .single()

  return { title: data?.title ?? 'Recipe' }
}

export const revalidate = 0

export default async function RecipePage({ params }: PageProps) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      category:categories(*),
      tags:recipe_tags(tag:tags(*)),
      ingredient_sections(*),
      recipe_ingredients(*),
      method_steps(*)
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) notFound()

  const recipe = {
    ...data,
    tags:                data.tags?.map((rt: any) => rt.tag).filter(Boolean) ?? [],
    ingredient_sections: data.ingredient_sections?.sort((a: any, b: any) => a.display_order - b.display_order) ?? [],
    recipe_ingredients:  data.recipe_ingredients?.sort((a: any, b: any) => a.display_order - b.display_order) ?? [],
    method_steps:        data.method_steps?.sort((a: any, b: any) => a.step_number - b.step_number) ?? [],
  }

  return <RecipeViewWrapper recipe={recipe} />
}
