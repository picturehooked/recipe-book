import { createClient } from '@/lib/supabase/server'
import { BrowsePage } from '@/components/browse/BrowsePage'
import type { Category, Tag } from '@/types'

export const revalidate = 0

export default async function HomePage() {
  const supabase = createClient()

  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('tags').select('*').order('name'),
  ])

  return (
    <BrowsePage
      categories={(categories ?? []) as Category[]}
      tags={(tags ?? []) as Tag[]}
    />
  )
}
