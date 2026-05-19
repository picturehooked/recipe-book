import { RecipeCard } from './RecipeCard'
import { cn } from '@/lib/utils/cn'
import type { RecipeSummary } from '@/types'

interface RecipeGridProps {
  recipes:   RecipeSummary[]
  loading?:  boolean
  className?: string
}

export function RecipeGrid({ recipes, loading, className }: RecipeGridProps) {
  if (loading) {
    return (
      <div className={cn(
        'grid gap-4',
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        className,
      )}>
        {Array.from({ length: 8 }).map((_, i) => (
          <RecipeCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-5xl mb-4">🍽️</p>
        <p className="font-serif text-xl text-zinc-600 dark:text-zinc-400">No recipes found</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
          Try adjusting your filters or add a new recipe
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      'grid gap-4',
      'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
      className,
    )}>
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  )
}

function RecipeCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-850 border border-parchment-200 dark:border-slate-800 animate-pulse">
      <div className="aspect-[4/3] bg-parchment-100 dark:bg-slate-800" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-parchment-200 dark:bg-slate-700 rounded-full w-3/4" />
        <div className="h-3 bg-parchment-100 dark:bg-slate-800 rounded-full w-1/2" />
      </div>
    </div>
  )
}
