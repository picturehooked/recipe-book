'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Edit2, Users, ExternalLink,
  CheckCircle2, Circle, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FavouriteButton } from '@/components/ui/FavouriteButton'
import { formatServings } from '@/lib/utils/formatters'
import { scaleQuantity, formatQuantity } from '@/lib/utils/conversions'
import { useDeleteRecipe } from '@/hooks/useRecipes'
import type { Recipe, RecipeIngredient } from '@/types'

interface RecipeViewProps {
  recipe: Recipe
}

type ActiveTab = 'ingredients' | 'method'

export function RecipeView({ recipe }: RecipeViewProps) {
  const router   = useRouter()
  const deleteRecipe = useDeleteRecipe()

  // Servings scaler
  const baseServings    = recipe.servings ?? 4
  const [servings, setServings] = useState(baseServings)
  const scalingRatio = servings / baseServings

  // Method step progress
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Ingredient tick-off
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())

  // Mobile tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('ingredients')

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const ingredients = useMemo(
    () => recipe.recipe_ingredients ?? [],
    [recipe.recipe_ingredients]
  )
  const sections = useMemo(
    () => recipe.ingredient_sections ?? [],
    [recipe.ingredient_sections]
  )
  const steps = useMemo(
    () => recipe.method_steps ?? [],
    [recipe.method_steps]
  )

  // Group ingredients by section
  const groupedIngredients = useMemo(() => {
    if (sections.length === 0) {
      return [{ id: null, title: null, ingredients }]
    }
    return sections.map((sec) => ({
      id:          sec.id,
      title:       sec.title,
      ingredients: ingredients.filter((i) => i.section_id === sec.id),
    }))
  }, [sections, ingredients])

  function toggleStep(n: number) {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.has(n) ? next.delete(n) : next.add(n)
      return next
    })
  }

  function toggleIngredient(id: string) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await deleteRecipe(recipe.id)
      router.push('/')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const totalSteps     = steps.length
  const completedCount = completedSteps.size
  const progressPct    = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  return (
    <div className="min-h-screen bg-parchment-50 dark:bg-slate-900">
      {/* ---- Top bar ---------------------------------------- */}
      <div className={cn(
        'sticky top-14 z-30',
        'bg-parchment-50/95 dark:bg-slate-900/95 backdrop-blur-sm',
        'border-b border-parchment-200 dark:border-slate-800',
      )}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-11 gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">All recipes</span>
              <span className="sm:hidden">Back</span>
            </Link>

            <div className="flex items-center gap-1">
              <FavouriteButton
                recipeId={recipe.id}
                active={recipe.is_favourite}
                size="md"
              />
              <Link href={`/recipes/${recipe.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Edit2 className="h-4 w-4" strokeWidth={1.75} />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                loading={deleting}
                className={confirmDelete ? 'text-red-500 hover:text-red-600' : 'text-zinc-400 hover:text-red-500'}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">{confirmDelete ? 'Confirm' : ''}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">

        {/* ---- Recipe header -------------------------------- */}
        <div className="pt-5 pb-4">
          {/* Category + tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {recipe.category && (
              <Badge variant="amber">{recipe.category.name}</Badge>
            )}
            {recipe.tags?.map((t) => (
              <Badge key={t.id} variant="tag" active={false}>{t.name}</Badge>
            ))}
          </div>

          {/* Title row — image floated right on sm+ */}
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                {recipe.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {recipe.servings && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setServings((s) => Math.max(1, s - 1))}
                        className="h-6 w-6 rounded-full border border-parchment-200 dark:border-slate-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-parchment-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                        aria-label="Decrease servings"
                      >−</button>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[2rem] text-center">
                        {servings}
                      </span>
                      <button
                        onClick={() => setServings((s) => s + 1)}
                        className="h-6 w-6 rounded-full border border-parchment-200 dark:border-slate-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-parchment-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                        aria-label="Increase servings"
                      >+</button>
                      <span className="text-sm text-zinc-400">
                        {servings === 1 ? 'serving' : 'servings'}
                      </span>
                    </div>
                  </div>
                )}

                {recipe.source && (
                  <a
                    href={recipe.source.startsWith('http') ? recipe.source : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-zinc-400 dark:text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span className="truncate max-w-[200px]">
                      {recipe.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                    </span>
                  </a>
                )}
              </div>
            </div>

            {/* Hero image — desktop: top-right alongside title */}
            {recipe.hero_image_url && (
              <div className="hidden sm:block flex-shrink-0 w-36 rounded-2xl overflow-hidden">
                <div className="relative aspect-square">
                  <Image
                    src={recipe.hero_image_url}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hero image — mobile: always visible, below title */}
          {recipe.hero_image_url && (
            <div className="sm:hidden mt-4 rounded-2xl overflow-hidden aspect-[16/9] relative">
              <Image
                src={recipe.hero_image_url}
                alt={recipe.title}
                fill
                className="object-cover"
                sizes="100vw"
              />
            </div>
          )}
        </div>

        {/* ---- Content: tabs (mobile) / side-by-side panels (desktop) ---- */}
        <div>
          {/* Main content */}
          <div className="min-w-0">

            {/* Mobile tabs */}
            <div className="lg:hidden flex rounded-xl overflow-hidden border border-parchment-200 dark:border-slate-700 mb-4">
              {(['ingredients', 'method'] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 py-2.5 text-sm font-medium transition-colors capitalize',
                    activeTab === tab
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-white dark:bg-slate-850 text-zinc-500 dark:text-zinc-400 hover:bg-parchment-100 dark:hover:bg-slate-800',
                  )}
                >
                  {tab}
                  {tab === 'method' && totalSteps > 0 && completedCount > 0 && (
                    <span className="ml-1.5 text-xs opacity-60">
                      {completedCount}/{totalSteps}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Desktop: side-by-side panels */}
            <div className="hidden lg:grid lg:grid-cols-[minmax(200px,280px)_1fr] gap-6">
              <IngredientPanel
                groups={groupedIngredients}
                scalingRatio={scalingRatio}
                scaledServings={servings}
                baseServings={baseServings}
                checkedIngredients={checkedIngredients}
                onToggleIngredient={toggleIngredient}
              />
              <MethodPanel
                steps={steps}
                completedSteps={completedSteps}
                progressPct={progressPct}
                onToggleStep={toggleStep}
                notes={recipe.notes}
              />
            </div>

            {/* Mobile: tab panels */}
            <div className="lg:hidden">
              {activeTab === 'ingredients' && (
                <IngredientPanel
                  groups={groupedIngredients}
                  scalingRatio={scalingRatio}
                  scaledServings={servings}
                  baseServings={baseServings}
                  checkedIngredients={checkedIngredients}
                  onToggleIngredient={toggleIngredient}
                />
              )}
              {activeTab === 'method' && (
                <MethodPanel
                  steps={steps}
                  completedSteps={completedSteps}
                  progressPct={progressPct}
                  onToggleStep={toggleStep}
                />
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}


// ---- Ingredient Panel ----------------------------------------

interface IngredientGroup {
  id:          string | null
  title:       string | null
  ingredients: RecipeIngredient[]
}

interface IngredientPanelProps {
  groups:              IngredientGroup[]
  scalingRatio:        number
  scaledServings:      number
  baseServings:        number
  checkedIngredients:  Set<string>
  onToggleIngredient:  (id: string) => void
}

function IngredientPanel({
  groups, scalingRatio, scaledServings, baseServings,
  checkedIngredients, onToggleIngredient,
}: IngredientPanelProps) {
  const isScaled = scaledServings !== baseServings

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Ingredients
        </h2>
        {isScaled && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Scaled ×{formatQuantity(scalingRatio)}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {groups.map((group, gi) => (
          <div key={group.id ?? gi}>
            {group.title && (
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                {group.title}
              </p>
            )}
            <ul className="space-y-1">
              {group.ingredients.map((ing) => {
                const checked = checkedIngredients.has(ing.id)
                const scaledQty = scaleQuantity(ing.quantity, scalingRatio)
                return (
                  <li key={ing.id}>
                    <button
                      onClick={() => onToggleIngredient(ing.id)}
                      className={cn(
                        'w-full text-left flex items-start gap-2.5 py-1.5 px-1 rounded-lg',
                        'hover:bg-parchment-50 dark:hover:bg-slate-800/50 transition-colors',
                        'group/ing',
                      )}
                    >
                      <span className="mt-0.5 flex-shrink-0">
                        {checked
                          ? <CheckCircle2 className="h-4 w-4 text-amber-500" strokeWidth={2} />
                          : <Circle className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover/ing:text-zinc-400 dark:group-hover/ing:text-zinc-500" strokeWidth={1.75} />
                        }
                      </span>
                      <span className={cn(
                        'recipe-base leading-snug text-zinc-800 dark:text-zinc-200',
                        checked && 'line-through text-zinc-400 dark:text-zinc-500',
                      )}>
                        {scaledQty !== null && (
                          <span className="font-medium">
                            {formatQuantity(scaledQty)}
                            {ing.unit && ing.unit !== 'number' && (
                              <span className="text-zinc-500 dark:text-zinc-400">
                                {ing.unit === 'g' || ing.unit === 'ml' ? '' : ' '}{ing.unit}
                              </span>
                            )}
                            {' '}
                          </span>
                        )}
                        {ing.ingredient_name}
                        {ing.preparation && (
                          <span className="text-zinc-400 dark:text-zinc-500">, {ing.preparation}</span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Method Panel --------------------------------------------

interface MethodPanelProps {
  steps:          { id: string; step_number: number; instruction: string }[]
  completedSteps: Set<number>
  progressPct:    number
  onToggleStep:   (n: number) => void
  notes?:         string | null
}

function MethodPanel({
  steps, completedSteps, progressPct, onToggleStep, notes
}: MethodPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Method
        </h2>
        {steps.length > 0 && completedSteps.size > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-parchment-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400">{progressPct}%</span>
          </div>
        )}
      </div>

      <ol className="space-y-3">
        {steps.map((step) => {
          const done = completedSteps.has(step.step_number)
          return (
            <li
              key={step.id}
              onClick={() => onToggleStep(step.step_number)}
              className={cn(
                'flex gap-3 p-3 rounded-xl cursor-pointer',
                'border border-transparent',
                'hover:border-parchment-200 dark:hover:border-slate-700',
                'hover:bg-white dark:hover:bg-slate-850',
                'transition-all',
                done && 'opacity-50',
              )}
            >
              {/* Step number circle */}
              <div className={cn(
                'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5',
                'text-xs font-bold',
                done
                  ? 'bg-amber-500 text-white'
                  : 'bg-parchment-200 dark:bg-slate-700 text-zinc-500 dark:text-zinc-400',
              )}>
                {done ? '✓' : step.step_number}
              </div>

              {/* Instruction */}
              <p className={cn(
                'recipe-base text-zinc-800 dark:text-zinc-200 leading-relaxed',
                done && 'line-through decoration-zinc-400 dark:decoration-zinc-600',
              )}>
                {step.instruction}
              </p>
            </li>
          )
        })}
      </ol>

      {notes && (
        <div className="mt-6 pt-4 border-t border-parchment-200 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
            Notes
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
            {notes}
          </p>
        </div>
      )}
    </div>
  )
}
