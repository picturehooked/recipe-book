'use client'

import { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useFilterStore } from '@/store/filterStore'

export function SearchBar() {
  const { query, setQuery } = useFilterStore()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative">
      <Search
        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none"
        strokeWidth={2}
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search recipes, ingredients…"
        className={cn(
          'w-full pl-10 pr-10 py-2.5 rounded-xl',
          'text-sm text-zinc-900 dark:text-zinc-100',
          'bg-white dark:bg-slate-850',
          'border border-parchment-200 dark:border-slate-700',
          'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
          'transition-shadow',
        )}
      />
      {query && (
        <button
          onClick={() => { setQuery(''); inputRef.current?.focus() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
