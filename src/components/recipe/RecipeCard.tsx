import Link from 'next/link'
import Image from 'next/image'
import { Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { FavouriteButton } from '@/components/ui/FavouriteButton'
import { formatTime } from '@/lib/utils/formatters'
import type { RecipeSummary } from '@/types'

interface RecipeCardProps {
  recipe:    RecipeSummary
  className?: string
}

export function RecipeCard({ recipe, className }: RecipeCardProps) {
  const totalTime = (recipe.prep_time_mins ?? 0) + (recipe.cook_time_mins ?? 0)

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={cn(
        'group relative flex flex-col rounded-2xl overflow-hidden',
        'bg-white dark:bg-slate-850',
        'border border-parchment-200 dark:border-slate-800',
        'shadow-card hover:shadow-card-md',
        'transition-shadow duration-200',
        className,
      )}
    >
      {/* Hero image */}
      <div className="relative aspect-[4/3] bg-parchment-100 dark:bg-slate-800 overflow-hidden">
        {recipe.hero_image_url ? (
          <Image
            src={recipe.hero_image_url}
            alt={recipe.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl opacity-20 select-none">
              {getCategoryEmoji(recipe.category?.slug)}
            </span>
          </div>
        )}

        {/* Favourite button — top right */}
        <div className="absolute top-2 right-2">
          <div className="rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <FavouriteButton
              recipeId={recipe.id}
              active={recipe.is_favourite}
              size="sm"
            />
          </div>
        </div>

        {/* Category badge — bottom left */}
        {recipe.category && (
          <div className="absolute bottom-2 left-2">
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              'bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm',
              'text-zinc-700 dark:text-zinc-300',
            )}>
              {recipe.category.name}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1.5 p-3">
        <h3 className={cn(
          'font-serif text-base font-semibold leading-snug',
          'text-zinc-900 dark:text-zinc-100',
          'group-hover:text-amber-700 dark:group-hover:text-amber-400',
          'transition-colors line-clamp-2',
        )}>
          {recipe.title}
        </h3>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" strokeWidth={1.75} />
              {recipe.servings}
            </span>
          )}
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" strokeWidth={1.75} />
              {formatTime(totalTime)}
            </span>
          )}
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {recipe.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="tag" active={false}>
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

function getCategoryEmoji(slug?: string): string {
  const map: Record<string, string> = {
    chicken:  '🍗',
    beef:     '🥩',
    lamb:     '🍖',
    fish:     '🐟',
    starters: '🥗',
    pasta:    '🍝',
    desserts: '🍰',
    bread:    '🍞',
    biscuits: '🍪',
  }
  return map[slug ?? ''] ?? '🍽️'
}
