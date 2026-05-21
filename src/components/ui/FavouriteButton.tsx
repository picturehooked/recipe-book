'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useToggleFavourite } from '@/hooks/useRecipes'

interface FavouriteButtonProps {
  recipeId:  string
  active:    boolean
  size?:     'xs' | 'sm' | 'md' | 'lg'
  className?: string
  onToggle?: (newState: boolean) => void
}

const sizeMap = {
  xs:  'h-2.5 w-2.5',
  sm:  'h-4 w-4',
  md:  'h-5 w-5',
  lg:  'h-6 w-6',
}
const btnSizeMap = {
  xs:  'p-1',
  sm:  'p-1.5',
  md:  'p-2',
  lg:  'p-2.5',
}

export function FavouriteButton({
  recipeId,
  active,
  size = 'md',
  className,
  onToggle,
}: FavouriteButtonProps) {
  const [isFav, setIsFav]     = useState(active)
  const [loading, setLoading] = useState(false)
  const toggle = useToggleFavourite()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const next = await toggle(recipeId, isFav)
      setIsFav(next)
      onToggle?.(next)
    } catch {
      // silent — user can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
      className={cn(
        'rounded-full transition-all',
        btnSizeMap[size],
        isFav
          ? 'text-red-500 hover:text-red-600'
          : 'text-zinc-300 dark:text-zinc-600 hover:text-red-400',
        'disabled:opacity-50',
        className,
      )}
    >
      <Heart
        className={cn(sizeMap[size], isFav && 'fill-current')}
        strokeWidth={isFav ? 0 : 1.75}
      />
    </button>
  )
}
