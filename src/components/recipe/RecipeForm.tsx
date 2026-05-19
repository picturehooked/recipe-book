'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical, Image as ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { IngredientInput } from '@/components/ui/IngredientInput'
import { createClient } from '@/lib/supabase/client'
import { useIngredients } from '@/hooks/useIngredients'
import type { Recipe, Category, Tag, RecipeFormValues } from '@/types'

const UNITS = [
  { value: '',        label: '—' },
  { value: 'g',      label: 'g' },
  { value: 'kg',     label: 'kg' },
  { value: 'ml',     label: 'ml' },
  { value: 'l',      label: 'l' },
  { value: 'tsp',    label: 'tsp' },
  { value: 'tbsp',   label: 'tbsp' },
  { value: 'cups',   label: 'cups' },
  { value: 'number', label: '#' },
]

const schema = z.object({
  title:          z.string().min(1, 'Recipe title is required'),
  category_id:    z.string().optional(),
  tag_ids:        z.array(z.string()).default([]),
  servings:       z.string().optional(),
  source:         z.string().optional(),
  notes:          z.string().optional(),
  hero_image_url: z.string().optional(),
  sections: z.array(z.object({
    id:            z.string().optional(),
    title:         z.string().default(''),
    display_order: z.number().default(0),
    ingredients:   z.array(z.object({
      id:              z.string().optional(),
      ingredient_name: z.string().min(1, 'Required'),
      quantity:        z.string().default(''),
      unit:            z.string().default(''),
      preparation:     z.string().default(''),
      display_order:   z.number().default(0),
    })).default([]),
  })).default([{ title: '', display_order: 0, ingredients: [] }]),
  method_steps: z.array(z.string()).default(['']),
})

interface RecipeFormProps {
  recipe?:    Recipe
  categories: Category[]
  tags:       Tag[]
  prefill?:   Partial<RecipeFormValues>
}

export function RecipeForm({ recipe, categories, tags, prefill }: RecipeFormProps) {
  const router      = useRouter()
  const supabase    = createClient()
  const { getOrCreate } = useIngredients()

  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(recipe?.hero_image_url ?? null)
  const [uploading, setUploading]       = useState(false)

  // Track which method step index to focus after appending
  const [focusStepIdx, setFocusStepIdx] = useState<number | null>(null)

  const defaultValues: RecipeFormValues = {
    title:          recipe?.title          ?? prefill?.title          ?? '',
    category_id:    recipe?.category_id    ?? prefill?.category_id    ?? '',
    tag_ids:        recipe?.tags?.map((t) => t.id) ?? prefill?.tag_ids ?? [],
    servings:       recipe?.servings?.toString() ?? prefill?.servings ?? '',
    prep_time_mins: '',
    cook_time_mins: '',
    source:         recipe?.source         ?? prefill?.source         ?? '',
    notes:          recipe?.notes          ?? prefill?.notes          ?? '',
    hero_image_url: recipe?.hero_image_url ?? prefill?.hero_image_url ?? '',
    hero_image_file: null,
    sections: recipe
      ? (recipe.ingredient_sections ?? []).map((sec) => ({
          id: sec.id,
          title: sec.title ?? '',
          display_order: sec.display_order,
          ingredients: (recipe.recipe_ingredients ?? [])
            .filter((i) => i.section_id === sec.id)
            .sort((a, b) => a.display_order - b.display_order)
            .map((i) => ({
              id:              i.id,
              ingredient_name: i.ingredient_name,
              quantity:        i.quantity?.toString() ?? '',
              unit:            i.unit ?? '',
              preparation:     i.preparation ?? '',
              display_order:   i.display_order,
            })),
        }))
      : prefill?.sections ?? [{ title: '', display_order: 0, ingredients: [{ ingredient_name: '', quantity: '', unit: '', preparation: '', display_order: 0 }] }],
    method_steps: recipe
      ? (recipe.method_steps ?? []).sort((a, b) => a.step_number - b.step_number).map((s) => s.instruction)
      : prefill?.method_steps ?? [''],
  }

  const {
    register, control, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const { fields: sections, append: appendSection, remove: removeSection } = useFieldArray({
    control, name: 'sections',
  })

  const { fields: methodSteps, append: appendStep, remove: removeStep } = useFieldArray({
    control, name: 'method_steps' as any,
  })

  const tagIds = watch('tag_ids')

  // Focus the newly created method step after render
  useEffect(() => {
    if (focusStepIdx !== null) {
      const el = document.querySelector(`[data-method-step="${focusStepIdx}"]`) as HTMLTextAreaElement | null
      if (el) {
        el.focus()
        setFocusStepIdx(null)
      }
    }
  }, [focusStepIdx, methodSteps.length])

  function handleAddStep() {
    if (methodSteps.length >= 10) return
    appendStep('' as any)
    setFocusStepIdx(methodSteps.length)
  }

  function handleStepKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, idx: number) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (methodSteps.length < 10) {
        appendStep('' as any)
        setFocusStepIdx(methodSteps.length)
      }
    }
  }

  // ---- Image upload ------------------------------------------
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `recipes/${Date.now()}.${ext}`
      const { data, error: upErr } = await supabase.storage
        .from('recipe-images')
        .upload(path, file, { upsert: true })

      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(data.path)

      setValue('hero_image_url', publicUrl)
      setImagePreview(publicUrl)
    } catch (err: any) {
      setError('Image upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // ---- Save --------------------------------------------------
  const onSubmit = useCallback(async (values: RecipeFormValues) => {
    setSaving(true)
    setError(null)

    try {
      // Auto-add any new ingredients to the global ingredient database
      const allIngredientNames = values.sections.flatMap((sec) =>
        sec.ingredients
          .map((i) => i.ingredient_name.trim())
          .filter(Boolean)
      )
      const ingredientIdMap = new Map<string, string>()
      await Promise.all(
        allIngredientNames.map(async (name) => {
          const ing = await getOrCreate(name)
          if (ing) ingredientIdMap.set(name.toLowerCase(), ing.id)
        })
      )

      const recipePayload = {
        title:          values.title,
        category_id:    values.category_id || null,
        hero_image_url: values.hero_image_url || null,
        servings:       values.servings ? parseInt(values.servings) : null,
        source:         values.source || null,
        notes:          values.notes  || null,
      }

      let recipeId = recipe?.id

      if (recipe) {
        const { error: updateErr } = await supabase
          .from('recipes')
          .update(recipePayload)
          .eq('id', recipe.id)
        if (updateErr) throw updateErr
      } else {
        const { data: newRecipe, error: insertErr } = await supabase
          .from('recipes')
          .insert(recipePayload)
          .select('id')
          .single()
        if (insertErr) throw insertErr
        recipeId = newRecipe.id
      }

      // Tags — delete and re-insert
      await supabase.from('recipe_tags').delete().eq('recipe_id', recipeId)
      if (values.tag_ids.length > 0) {
        await supabase.from('recipe_tags').insert(
          values.tag_ids.map((tid) => ({ recipe_id: recipeId, tag_id: tid }))
        )
      }

      // Ingredient sections + ingredients — delete and re-insert
      await supabase.from('ingredient_sections').delete().eq('recipe_id', recipeId)

      for (let si = 0; si < values.sections.length; si++) {
        const sec = values.sections[si]
        const validIngredients = sec.ingredients.filter((i) => i.ingredient_name.trim())
        if (!sec.title && validIngredients.length === 0) continue

        const { data: secData } = await supabase
          .from('ingredient_sections')
          .insert({ recipe_id: recipeId, title: sec.title || null, display_order: si })
          .select('id')
          .single()

        if (secData && validIngredients.length > 0) {
          await supabase.from('recipe_ingredients').insert(
            validIngredients.map((ing, ii) => ({
              recipe_id:       recipeId,
              section_id:      secData.id,
              ingredient_id:   ingredientIdMap.get(ing.ingredient_name.trim().toLowerCase()) ?? null,
              ingredient_name: ing.ingredient_name.trim(),
              quantity:        ing.quantity ? parseFloat(ing.quantity) : null,
              unit:            ing.unit || null,
              preparation:     ing.preparation || null,
              display_order:   ii,
            }))
          )
        }
      }

      // Method steps — delete and re-insert
      await supabase.from('method_steps').delete().eq('recipe_id', recipeId)
      const validSteps = values.method_steps.filter((s) => s.trim())
      if (validSteps.length > 0) {
        await supabase.from('method_steps').insert(
          validSteps.map((instruction, idx) => ({
            recipe_id:   recipeId,
            step_number: idx + 1,
            instruction: instruction.trim(),
          }))
        )
      }

      router.push(`/recipes/${recipeId}`)
    } catch (err: any) {
      setError(err.message ?? 'Failed to save recipe')
      setSaving(false)
    }
  }, [recipe, supabase, router, getOrCreate])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ---- Basic info ------------------------------------ */}
      <section className="rounded-2xl bg-white dark:bg-slate-850 border border-parchment-200 dark:border-slate-800 p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Recipe details
        </h2>

        <Input
          label="Title"
          placeholder="e.g. Slow-cooked lamb shoulder"
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Select
                label="Category"
                placeholder="Select category"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                {...field}
              />
            )}
          />
          <Input
            label="Servings"
            type="number"
            min="1"
            placeholder="4"
            {...register('servings')}
          />
        </div>

        <Input
          label="Source"
          placeholder="URL, book name, or person"
          {...register('source')}
        />
      </section>

      {/* ---- Tags ----------------------------------------- */}
      <section className="rounded-2xl bg-white dark:bg-slate-850 border border-parchment-200 dark:border-slate-800 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Tags
        </h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="tag"
              active={tagIds.includes(tag.id)}
              onClick={() => {
                const current = tagIds
                const next = current.includes(tag.id)
                  ? current.filter((t) => t !== tag.id)
                  : [...current, tag.id]
                setValue('tag_ids', next)
              }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </section>

      {/* ---- Hero image ------------------------------------ */}
      <section className="rounded-2xl bg-white dark:bg-slate-850 border border-parchment-200 dark:border-slate-800 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Photo
        </h2>
        <div className="flex gap-4 items-start">
          {imagePreview ? (
            <div className="relative h-24 w-24 rounded-xl overflow-hidden flex-shrink-0">
              <img src={imagePreview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => { setImagePreview(null); setValue('hero_image_url', '') }}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="h-24 w-24 rounded-xl border-2 border-dashed border-parchment-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-6 w-6 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className={cn(
              'cursor-pointer inline-flex items-center gap-2 rounded-xl px-3.5 py-2',
              'text-sm font-medium',
              'bg-parchment-100 hover:bg-parchment-200 dark:bg-slate-800 dark:hover:bg-slate-700',
              'text-zinc-700 dark:text-zinc-300',
              'border border-parchment-200 dark:border-slate-700',
              'transition-colors',
              uploading && 'opacity-50 pointer-events-none',
            )}>
              {uploading ? 'Uploading…' : 'Upload photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              JPG, PNG or WebP. Max 10 MB.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Ingredients ---------------------------------- */}
      <section className="rounded-2xl bg-white dark:bg-slate-850 border border-parchment-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Ingredients
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => appendSection({ title: '', display_order: sections.length, ingredients: [] })}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add section
          </Button>
        </div>

        <div className="space-y-5">
          {sections.map((section, si) => (
            <IngredientSection
              key={section.id}
              sectionIndex={si}
              control={control}
              register={register}
              totalSections={sections.length}
              onRemoveSection={() => removeSection(si)}
            />
          ))}
        </div>
      </section>

      {/* ---- Method --------------------------------------- */}
      <section className="rounded-2xl bg-white dark:bg-slate-850 border border-parchment-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Method
          </h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {methodSteps.length}/10 steps
          </span>
        </div>

        <div className="space-y-3">
          {methodSteps.map((step, idx) => (
            <div key={step.id} className="flex gap-2 items-start">
              <div className={cn(
                'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-2.5',
                'text-xs font-bold',
                'bg-parchment-100 dark:bg-slate-700 text-zinc-500 dark:text-zinc-400',
              )}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <Textarea
                  rows={2}
                  placeholder={`Step ${idx + 1}…`}
                  className="resize-y"
                  data-method-step={idx}
                  onKeyDown={(e) => handleStepKeyDown(e as React.KeyboardEvent<HTMLTextAreaElement>, idx)}
                  {...register(`method_steps.${idx}` as any)}
                />
              </div>
              {methodSteps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(idx)}
                  className="mt-2.5 p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          ))}

          {methodSteps.length < 10 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddStep}
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Add step
            </Button>
          )}
        </div>
      </section>

      {/* ---- Notes ---------------------------------------- */}
      <section className="rounded-2xl bg-white dark:bg-slate-850 border border-parchment-200 dark:border-slate-800 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
          Notes
        </h2>
        <Textarea
          rows={3}
          placeholder="Any tips, variations, or storage notes…"
          {...register('notes')}
        />
      </section>

      {/* ---- Actions -------------------------------------- */}
      <div className="flex gap-3 pb-8">
        <Button type="submit" size="lg" loading={saving}>
          {recipe ? 'Save changes' : 'Save recipe'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ---- Ingredient section sub-component ----------------------

interface IngredientSectionProps {
  sectionIndex:    number
  control:         any
  register:        any
  totalSections:   number
  onRemoveSection: () => void
}

function IngredientSection({
  sectionIndex, control, register, totalSections, onRemoveSection,
}: IngredientSectionProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.ingredients`,
  })

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const dragSrcIdx = useRef<number | null>(null)

  function handleDragStart(e: React.DragEvent, idx: number) {
    dragSrcIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  function handleDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault()
    if (dragSrcIdx.current !== null && dragSrcIdx.current !== toIdx) {
      move(dragSrcIdx.current, toIdx)
    }
    dragSrcIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    dragSrcIdx.current = null
    setDragOverIdx(null)
  }

  return (
    <div className="space-y-2">
      {/* Section title */}
      {totalSections > 1 && (
        <div className="flex items-center gap-2">
          <input
            placeholder="Section name (e.g. For the sauce)"
            className={cn(
              'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium italic',
              'text-zinc-700 dark:text-zinc-300',
              'bg-parchment-50 dark:bg-slate-800',
              'border border-parchment-200 dark:border-slate-700',
              'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
              'placeholder:text-zinc-300 dark:placeholder:text-zinc-600',
            )}
            {...register(`sections.${sectionIndex}.title`)}
          />
          <button
            type="button"
            onClick={onRemoveSection}
            className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Ingredients */}
      <div className="space-y-1.5">
        {fields.map((field, ii) => (
          <div
            key={field.id}
            draggable
            onDragStart={(e) => handleDragStart(e, ii)}
            onDragOver={(e) => handleDragOver(e, ii)}
            onDrop={(e) => handleDrop(e, ii)}
            onDragEnd={handleDragEnd}
            className={cn(
              'flex gap-1.5 items-center rounded-lg transition-colors',
              dragOverIdx === ii && 'bg-amber-50 dark:bg-amber-900/10',
            )}
          >
            {/* Drag handle */}
            <div className="cursor-grab active:cursor-grabbing flex-shrink-0 p-1 text-zinc-300 dark:text-zinc-600 hover:text-zinc-400 touch-none">
              <GripVertical className="h-4 w-4" strokeWidth={1.75} />
            </div>

            {/* Quantity */}
            <input
              type="text"
              inputMode="decimal"
              placeholder="Qty"
              className={cn(
                'w-16 rounded-lg px-2.5 py-2 text-sm text-center',
                'text-zinc-900 dark:text-zinc-100',
                'bg-white dark:bg-slate-850',
                'border border-parchment-200 dark:border-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-amber-500',
              )}
              {...register(`sections.${sectionIndex}.ingredients.${ii}.quantity`)}
            />

            {/* Unit */}
            <select
              className={cn(
                'w-20 rounded-lg px-1.5 py-2 text-sm',
                'text-zinc-900 dark:text-zinc-100',
                'bg-white dark:bg-slate-850',
                'border border-parchment-200 dark:border-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-amber-500',
                'appearance-none',
              )}
              {...register(`sections.${sectionIndex}.ingredients.${ii}.unit`)}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>

            {/* Name (autocomplete) */}
            <Controller
              control={control}
              name={`sections.${sectionIndex}.ingredients.${ii}.ingredient_name`}
              render={({ field: f }) => (
                <IngredientInput
                  value={f.value}
                  onChange={(v) => f.onChange(v)}
                  className="flex-1 min-w-0"
                  placeholder="Ingredient"
                />
              )}
            />

            {/* Preparation */}
            <input
              placeholder="e.g. chopped"
              className={cn(
                'hidden sm:block w-32 rounded-lg px-2.5 py-2 text-sm',
                'text-zinc-700 dark:text-zinc-300',
                'bg-white dark:bg-slate-850',
                'border border-parchment-200 dark:border-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-amber-500',
                'placeholder:text-zinc-300 dark:placeholder:text-zinc-600',
              )}
              {...register(`sections.${sectionIndex}.ingredients.${ii}.preparation`)}
            />

            {/* Remove */}
            <button
              type="button"
              onClick={() => remove(ii)}
              className="p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => append({ ingredient_name: '', quantity: '', unit: '', preparation: '', display_order: fields.length })}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add ingredient
        </Button>
      </div>
    </div>
  )
}
