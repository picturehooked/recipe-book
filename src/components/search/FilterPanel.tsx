'use client'

import { useState } from 'react'
import { Heart, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useFilterStore } from '@/store/filterStore'
import type { Category, Tag } from '@/types'

interface FilterPanelProps {
  categories: Category[]
  tags:       Tag[]
  totalCount: number
}

export function FilterPanel({ categories, tags, totalCount }: FilterPanelProps) {
  const {
    category_ids, tag_ids, favourites_only,
    toggleCategory, toggleTag, toggleFavourites, clearFilters,
  } = useFilterStore()

  const [tagsExpanded, setTagsExpanded] = useState(false)

  const activeFilterCount =
    category_ids.length + tag_ids.length + (favourites_only ? 1 : 0)

  return (
    <div className="space-y-3">
      {/* Category row — horizontal scroll on mobile */}
      <div className="flex items-center gap-2">
        {/* Favourites chip */}
        <button
          onClick={toggleFavourites}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5',
            'text-sm font-medium transition-colors',
            favourites_only
              ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-700'
              : 'bg-white dark:bg-slate-850 text-zinc-500 dark:text-zinc-400 border border-parchment-200 dark:border-slate-700 hover:border-parchment-300 dark:hover:border-slate-600',
          )}
        >
          <Heart
            className={cn('h-3.5 w-3.5', favourites_only && 'fill-current')}
            strokeWidth={favourites_only ? 0 : 1.75}
          />
          <span className="hidden sm:inline">Favourites</span>
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-parchment-200 dark:bg-slate-700 flex-shrink-0" />

        {/* Category chips — scrollable */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 flex-1">
          {categories.map((cat) => {
            const active = category_ids.includes(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1.5',
                  'text-sm font-medium transition-colors',
                  active
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-white dark:bg-slate-850 text-zinc-500 dark:text-zinc-400 border border-parchment-200 dark:border-slate-700 hover:border-parchment-300 dark:hover:border-slate-600',
                )}
              >
                {cat.name}
              </button>
            )
          })}
        </div>

        {/* Tag filter toggle */}
        <button
          onClick={() => setTagsExpanded((v) => !v)}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5',
            'text-sm font-medium transition-colors border',
            tagsExpanded || tag_ids.length > 0
              ? 'bg-parchment-100 dark:bg-slate-800 border-parchment-200 dark:border-slate-700 text-zinc-700 dark:text-zinc-300'
              : 'bg-white dark:bg-slate-850 text-zinc-500 dark:text-zinc-400 border-parchment-200 dark:border-slate-700 hover:border-parchment-300 dark:hover:border-slate-600',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Tags</span>
          {tag_ids.length > 0 && (
            <span className="ml-0.5 text-xs bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full h-4 w-4 flex items-center justify-center font-bold">
              {tag_ids.length}
            </span>
          )}
        </button>
      </div>

      {/* Tag row (expandable) */}
      {tagsExpanded && (
        <div className="flex flex-wrap gap-1.5 pl-0">
          {tags.map((tag) => {
            const active = tag_ids.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900'
                    : 'bg-parchment-100 dark:bg-slate-800 text-zinc-500 dark:text-zinc-400 hover:bg-parchment-200 dark:hover:bg-slate-700',
                )}
              >
                {tag.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Results count + clear */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {totalCount} {totalCount === 1 ? 'recipe' : 'recipes'}
        </p>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="h-3 w-3" strokeWidth={2} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
