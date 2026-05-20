'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Search, Trash2, Check, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'
import type { Ingredient } from '@/types'

export default function IngredientsPage() {
  const supabase = createClient()

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading]         = useState(true)
  const [query, setQuery]             = useState('')
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving]           = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ingredients')
      .select('*, ingredient_category:ingredient_categories(id, name, sort_order)')
      .order('name')
    setIngredients(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = ingredients.filter((i) =>
    !query.trim() || i.name.toLowerCase().includes(query.toLowerCase())
  )

  // Group by category
  const grouped = filtered.reduce<Record<string, Ingredient[]>>((acc, ing) => {
    const cat = (ing as any).ingredient_category?.name ?? 'Uncategorised'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ing)
    return acc
  }, {})

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    if (a === 'Uncategorised') return 1
    if (b === 'Uncategorised') return -1
    return a.localeCompare(b)
  })

  function startEdit(ing: Ingredient) {
    setEditingId(ing.id)
    setEditingName(ing.name)
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName('')
  }

  async function saveEdit() {
    if (!editingId || !editingName.trim()) return
    setSaving(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('ingredients')
        .update({ name: editingName.trim() })
        .eq('id', editingId)
      if (err) throw err
      setIngredients((prev) =>
        prev.map((i) => i.id === editingId ? { ...i, name: editingName.trim() } : i)
      )
      setEditingId(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteIngredient(id: string) {
    if (deletingId !== id) {
      setDeletingId(id)
      return
    }
    try {
      const { error: err } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id)
      if (err) throw err
      setIngredients((prev) => prev.filter((i) => i.id !== id))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Back
        </Link>
        <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Ingredients
        </h1>
        <span className="ml-auto text-sm text-zinc-400 dark:text-zinc-500">
          {ingredients.length} total
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 mb-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" strokeWidth={1.75} />
        <input
          type="search"
          placeholder="Search ingredients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm',
            'bg-white dark:bg-slate-850',
            'border border-parchment-200 dark:border-slate-700',
            'text-zinc-900 dark:text-zinc-100',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
            'focus:outline-none focus:ring-2 focus:ring-amber-500',
          )}
        />
      </div>

      {/* Delete confirmation hint */}
      {deletingId && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 mb-4 text-sm text-amber-700 dark:text-amber-400">
          Click the delete button again to confirm — this cannot be undone.
        </div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-12">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-12">
          {query ? 'No ingredients match that search.' : 'No ingredients yet.'}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([category, items]) => (
            <section key={category}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2 px-1">
                {category}
              </h2>
              <div className="rounded-2xl bg-white dark:bg-slate-850 border border-parchment-200 dark:border-slate-800 divide-y divide-parchment-100 dark:divide-slate-800 overflow-hidden">
                {items.map((ing) => (
                  <div key={ing.id} className="flex items-center gap-2 px-4 py-2.5">
                    {editingId === ing.id ? (
                      <>
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit()
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className={cn(
                            'flex-1 rounded-lg px-2.5 py-1 text-sm',
                            'bg-parchment-50 dark:bg-slate-800',
                            'border border-amber-400 dark:border-amber-600',
                            'text-zinc-900 dark:text-zinc-100',
                            'focus:outline-none focus:ring-2 focus:ring-amber-500',
                          )}
                        />
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="p-1.5 text-green-500 hover:text-green-600 transition-colors"
                          title="Save"
                        >
                          <Check className="h-4 w-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">
                          {ing.name}
                        </span>
                        <button
                          onClick={() => startEdit(ing)}
                          className="p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                          title="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => deleteIngredient(ing.id)}
                          className={cn(
                            'p-1.5 transition-colors',
                            deletingId === ing.id
                              ? 'text-red-500 hover:text-red-600'
                              : 'text-zinc-300 dark:text-zinc-600 hover:text-red-400',
                          )}
                          title={deletingId === ing.id ? 'Click again to confirm delete' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
