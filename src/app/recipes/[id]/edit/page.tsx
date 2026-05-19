import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecipeForm } from '@/components/recipe/RecipeForm'
import type { Metadata } from 'next'
import type { Category, Tag, Recipe } from '@/types'

interface PageProps { params: { id: string } }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase.from('recipes').select('title').eq('id', params.id).single()
  return { title: data?.title ? `Edit: ${data.title}` : 'Edit recipe' }
}

export const revalidate = 0

export default async function EditRecipePage({ params }: PageProps) {
  const supabase = createClient()

  const [{ data: recipe, error }, { data: categories }, { data: tags }] = await Promise.all([
    supabase
      .from('recipes')
      .select(`*, category:categories(*), tags:recipe_tags(tag:tags(*)), ingredient_sections(*), recipe_ingredients(*), method_steps(*)`)
      .eq('id', params.id)
      .single(),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('tags').select('*').order('name'),
  ])

  if (error || !recipe) notFound()

  const normalised: Recipe = {
    ...recipe,
    tags:                recipe.tags?.map((rt: any) => rt.tag).filter(Boolean) ?? [],
    ingredient_sections: recipe.ingredient_sections?.sort((a: any, b: any) => a.display_order - b.display_order) ?? [],
    recipe_ingredients:  recipe.recipe_ingredients?.sort((a: any, b: any) => a.display_order - b.display_order) ?? [],
    method_steps:        recipe.method_steps?.sort((a: any, b: any) => a.step_number - b.step_number) ?? [],
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
        Edit recipe
      </h1>
      <RecipeForm
        recipe={normalised}
        categories={(categories ?? []) as Category[]}
        tags={(tags ?? []) as Tag[]}
      />
    </div>
  )
}
