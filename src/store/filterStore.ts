import { create } from 'zustand'
import type { FilterState } from '@/types'

interface FilterStore extends FilterState {
  setQuery:          (q: string) => void
  toggleCategory:    (id: string) => void
  toggleTag:         (id: string) => void
  toggleFavourites:  () => void
  clearFilters:      () => void
}

export const useFilterStore = create<FilterStore>((set) => ({
  query:           '',
  category_ids:    [],
  tag_ids:         [],
  favourites_only: false,

  setQuery: (q) => set({ query: q }),

  toggleCategory: (id) =>
    set((s) => ({
      category_ids: s.category_ids.includes(id)
        ? s.category_ids.filter((c) => c !== id)
        : [...s.category_ids, id],
    })),

  toggleTag: (id) =>
    set((s) => ({
      tag_ids: s.tag_ids.includes(id)
        ? s.tag_ids.filter((t) => t !== id)
        : [...s.tag_ids, id],
    })),

  toggleFavourites: () => set((s) => ({ favourites_only: !s.favourites_only })),

  clearFilters: () =>
    set({ query: '', category_ids: [], tag_ids: [], favourites_only: false }),
}))
