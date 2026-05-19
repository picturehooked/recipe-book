'use client'

import { useMemo } from 'react'
import Fuse from 'fuse.js'
import type { RecipeSummary, FilterState } from '@/types'

const fuseOptions: Fuse.IFuseOptions<RecipeSummary> = {
  keys: [
    { name: 'title',           weight: 0.6 },
    { name: 'category.name',   weight: 0.2 },
    { name: 'tags.name',       weight: 0.2 },
  ],
  threshold:          0.35,
  includeScore:       true,
  minMatchCharLength: 2,
}

export function useSearch(recipes: RecipeSummary[], filters: FilterState): RecipeSummary[] {
  const { query, category_ids, tag_ids, favourites_only } = filters

  return useMemo(() => {
    let results = recipes

    // Favourites filter
    if (favourites_only) {
      results = results.filter((r) => r.is_favourite)
    }

    // Category filter (OR logic — any matching category passes)
    if (category_ids.length > 0) {
      results = results.filter(
        (r) => r.category_id && category_ids.includes(r.category_id)
      )
    }

    // Tag filter (AND logic — recipe must have ALL selected tags)
    if (tag_ids.length > 0) {
      results = results.filter((r) =>
        tag_ids.every((tid) => r.tags?.some((t) => t.id === tid))
      )
    }

    // Text search
    if (query.trim().length >= 2) {
      const fuse = new Fuse(results, fuseOptions)
      results = fuse.search(query).map((r) => r.item)
    }

    return results
  }, [recipes, query, category_ids, tag_ids, favourites_only])
}
