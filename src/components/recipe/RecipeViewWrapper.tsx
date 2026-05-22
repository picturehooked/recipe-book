'use client'
// Thin client wrapper — RecipeView needs client-side state
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RecipeView } from './RecipeView'
import type { Recipe } from '@/types'

export function RecipeViewWrapper({ recipe }: { recipe: Recipe }) {
  const router = useRouter()

  // If the page is restored from the browser's bfcache (back/forward navigation),
  // force a fresh server fetch so edits are always reflected immediately.
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) router.refresh()
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [router])

  return <RecipeView recipe={recipe} />
}
