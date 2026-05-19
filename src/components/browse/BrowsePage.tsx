'use client'

import { useRecipes }     from '@/hooks/useRecipes'
import { useSearch }      from '@/hooks/useSearch'
import { useFilterStore } from '@/store/filterStore'
import { SearchBar }      from '@/components/search/SearchBar'
import { FilterPanel }    from '@/components/search/FilterPanel'
import { RecipeGrid }     from '@/components/recipe/RecipeGrid'
import type { Category, Tag, FilterState } from '@/types'

interface BrowsePageProps {
  categories: Category[]
  tags:       Tag[]
}

export function BrowsePage({ categories, tags }: BrowsePageProps) {
  const { recipes, loading } = useRecipes()
  const filters = useFilterStore() as FilterState
  const filtered = useSearch(recipes, filters)

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* Search */}
      <SearchBar />

      {/* Filters */}
      <FilterPanel
        categories={categories}
        tags={tags}
        totalCount={filtered.length}
      />

      {/* Grid */}
      <RecipeGrid
        recipes={filtered}
        loading={loading}
      />
    </div>
  )
}
