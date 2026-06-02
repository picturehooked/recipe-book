'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertTriangle, BookOpen, UtensilsCrossed, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Recipe, Category } from '@/types'
import type { ExportMode } from './ExportPDFButton'

// Dynamically import so @react-pdf/renderer never touches the server
const ExportPDFButton = dynamic(
  () => import('./ExportPDFButton').then(m => m.ExportPDFButton),
  {
    ssr: false,
    loading: () => (
      <button disabled className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-slate-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
        Loading…
      </button>
    ),
  }
)

const EXPORT_FIELDS = `
  *,
  category:categories(*),
  ingredient_sections(*),
  recipe_ingredients(*),
  method_steps(*)
`

interface CategoryGroup { category: Category | null; recipes: Recipe[] }

// ---- Shared toggle style -------------------------------------------
function SegmentedToggle<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; icon?: React.ElementType }[]
  value:   T
  onChange:(v: T) => void
}) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-parchment-200 dark:border-slate-700">
      {options.map(opt => {
        const Icon    = opt.icon
        const active  = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium transition-colors',
              active
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-white dark:bg-slate-850 text-zinc-500 dark:text-zinc-400 hover:bg-parchment-100 dark:hover:bg-slate-800',
            )}
          >
            {Icon && <Icon className="h-4 w-4" strokeWidth={1.75} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ---- Main component ------------------------------------------------

export function ExportPage() {
  const supabase = createClient()

  const [recipes,    setRecipes]    = useState<Recipe[]>([])
  const [loading,    setLoading]    = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [bookTitle,  setBookTitle]  = useState('')
  const [mode,       setMode]       = useState<ExportMode>('cookbook')
  const [darkMode,   setDarkMode]   = useState(false)

  // ---- Data fetch --------------------------------------------------
  useEffect(() => {
    async function load() {
      setLoading(true); setFetchError(null)
      try {
        const { data, error: err } = await supabase
          .from('recipes')
          .select(EXPORT_FIELDS)
          .order('title', { ascending: true })
        if (err) throw err
        const normalised: Recipe[] = (data ?? []).map((r: any) => ({
          ...r,
          ingredient_sections: (r.ingredient_sections ?? []).sort((a: any, b: any) => a.display_order - b.display_order),
          recipe_ingredients:  (r.recipe_ingredients  ?? []).sort((a: any, b: any) => a.display_order - b.display_order),
          method_steps:        (r.method_steps        ?? []).sort((a: any, b: any) => a.step_number   - b.step_number),
        }))
        setRecipes(normalised)
        setSelected(new Set(normalised.map(r => r.id)))
      } catch (e: any) {
        setFetchError(e?.message ?? 'Failed to load recipes')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Grouping (category sort_order, then name) -------------------
  const groups = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, CategoryGroup>()
    recipes.forEach(r => {
      const key = r.category?.id ?? '__uncat__'
      if (!map.has(key)) map.set(key, { category: r.category ?? null, recipes: [] })
      map.get(key)!.recipes.push(r)
    })
    return Array.from(map.values()).sort((a, b) => {
      const ao = a.category?.sort_order ?? 9999
      const bo = b.category?.sort_order ?? 9999
      return ao !== bo ? ao - bo : (a.category?.name ?? '').localeCompare(b.category?.name ?? '')
    })
  }, [recipes])

  const allSelected     = recipes.length > 0 && selected.size === recipes.length
  const selectedRecipes = recipes.filter(r => selected.has(r.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(recipes.map(r => r.id)))
  }
  function toggleRecipe(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ---- Loading / error states -------------------------------------
  if (loading) return (
    <div className="flex items-center justify-center py-14">
      <Loader2 className="h-6 w-6 animate-spin text-amber-500" strokeWidth={1.75} />
    </div>
  )

  if (fetchError) return (
    <div className={cn('flex items-start gap-2.5 rounded-xl p-3.5', 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800')}>
      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
      <p className="text-sm text-red-700 dark:text-red-400">{fetchError}</p>
    </div>
  )

  if (recipes.length === 0) return (
    <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-10">
      No recipes found. Add some recipes first.
    </p>
  )

  // ---- Main UI ----------------------------------------------------
  return (
    <div className="space-y-5">

      {/* Mode toggle — cookbook / menu */}
      <SegmentedToggle<ExportMode>
        options={[
          { value: 'cookbook', label: 'Cookbook', icon: BookOpen },
          { value: 'menu',     label: 'Menu',     icon: UtensilsCrossed },
        ]}
        value={mode}
        onChange={setMode}
      />

      {/* Cookbook-only options */}
      {mode === 'cookbook' && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Content style
          </span>
          <SegmentedToggle<'light' | 'dark'>
            options={[
              { value: 'light', label: 'Light', icon: Sun  },
              { value: 'dark',  label: 'Dark',  icon: Moon },
            ]}
            value={darkMode ? 'dark' : 'light'}
            onChange={v => setDarkMode(v === 'dark')}
          />
        </div>
      )}

      {/* Book / menu title */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">
          {mode === 'menu' ? 'Menu title' : 'Book title'}
        </label>
        <input
          type="text"
          value={bookTitle}
          onChange={e => setBookTitle(e.target.value)}
          placeholder={mode === 'menu' ? 'e.g. Dinner Menu — Saturday 14th' : 'e.g. The Family Recipe Book'}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-xl text-sm',
            'bg-white dark:bg-slate-850',
            'border border-parchment-200 dark:border-slate-700',
            'text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
            'focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600 transition-shadow',
          )}
        />
      </div>

      {/* Recipe selector */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {selectedRecipes.length} of {recipes.length} selected
          </span>
          <button
            onClick={toggleAll}
            className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div className={cn('rounded-xl overflow-hidden', 'border border-parchment-200 dark:border-slate-700', 'divide-y divide-parchment-100 dark:divide-slate-800')}>
          {groups.map(group => (
            <div key={group.category?.id ?? '__uncat__'}>
              <div className="px-4 py-2 bg-parchment-50 dark:bg-slate-800/60">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  {group.category?.name ?? 'Uncategorised'}
                </span>
              </div>
              {group.recipes.map(recipe => (
                <label key={recipe.id} className={cn('flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none', 'bg-white dark:bg-slate-850', 'hover:bg-parchment-50 dark:hover:bg-slate-800/50 transition-colors')}>
                  <input
                    type="checkbox"
                    checked={selected.has(recipe.id)}
                    onChange={() => toggleRecipe(recipe.id)}
                    className="h-4 w-4 rounded accent-amber-500 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug">{recipe.title}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Export button */}
      <div className="pt-1">
        <ExportPDFButton
          title={bookTitle}
          recipes={selectedRecipes}
          disabled={selectedRecipes.length === 0}
          darkMode={darkMode}
          mode={mode}
        />
        {selectedRecipes.length === 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">Select at least one recipe to export.</p>
        )}
      </div>
    </div>
  )
}
