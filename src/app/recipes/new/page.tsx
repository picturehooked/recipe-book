import { createClient } from '@/lib/supabase/server'
import { RecipeForm } from '@/components/recipe/RecipeForm'
import type { Metadata } from 'next'
import type { Category, Tag } from '@/types'

export const metadata: Metadata = { title: 'New recipe' }

export default async function NewRecipePage() {
  const supabase = createClient()
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('tags').select('*').order('name'),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
        New recipe
      </h1>
      <RecipeForm
        categories={(categories ?? []) as Category[]}
        tags={(tags ?? []) as Tag[]}
      />
    </div>
  )
}
