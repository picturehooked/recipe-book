'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, FileText, PenLine, ChevronLeft, AlertTriangle, ImagePlus, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { PhotoImport } from '@/components/import/PhotoImport'
import { FileImport }  from '@/components/import/FileImport'
import { RecipeForm }  from '@/components/recipe/RecipeForm'
import { createClient } from '@/lib/supabase/client'
import type { ImportMethod, ImportResult, Category, Tag } from '@/types'
import Link from 'next/link'

const METHODS: { id: ImportMethod; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'manual', label: 'Manual', icon: PenLine,  description: 'Enter recipe details from scratch' },
  { id: 'photo',  label: 'Photo',  icon: Camera,   description: 'Take or upload a photo of a recipe' },
  { id: 'file',   label: 'File',   icon: FileText, description: 'PDF or Word document — one or multiple recipes' },
]

export default function ImportPage() {
  const router  = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [method, setMethod]               = useState<ImportMethod | null>(null)
  // Multi-recipe queue
  const [importQueue, setImportQueue]     = useState<ImportResult[]>([])
  const [queueIndex, setQueueIndex]       = useState(0)
  const [queueTotal, setQueueTotal]       = useState(0)
  // Single active result (current item being reviewed)
  const [importResult, setImportResult]   = useState<ImportResult | null>(null)
  const [categories, setCategories]       = useState<Category[]>([])
  const [tags, setTags]                   = useState<Tag[]>([])
  const [heroImageUrl, setHeroImageUrl]   = useState<string | null>(null)
  const [heroPreview, setHeroPreview]     = useState<string | null>(null)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [heroError, setHeroError]         = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('tags').select('*').order('name'),
    ]).then(([{ data: cats }, { data: tgs }]) => {
      setCategories(cats ?? [])
      setTags(tgs ?? [])
    })
  }, [])

  // Advance to the next recipe in the queue, or go home when done
  function advanceQueue(fromIndex: number) {
    const next = fromIndex + 1
    if (next < importQueue.length) {
      setQueueIndex(next)
      const nextResult = importQueue[next]
      setImportResult(nextResult)
      setHeroImageUrl(nextResult.recipe?.hero_image_url ?? null)
      setHeroPreview(nextResult.recipe?.hero_image_url ?? null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // All done
      window.location.href = '/'
    }
  }

  // Called when FileImport or PhotoImport produces results
  function handleResults(results: ImportResult[]) {
    if (results.length === 0) return
    const successes = results.filter(r => r.success)
    if (successes.length === 0) {
      // All failed — show the first error
      setImportResult(results[0])
      return
    }
    setImportQueue(results)
    setQueueIndex(0)
    setQueueTotal(results.length)
    const first = results[0]
    setImportResult(first)
    setHeroImageUrl(first.recipe?.hero_image_url ?? null)
    setHeroPreview(first.recipe?.hero_image_url ?? null)
    if (first.success) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // PhotoImport still returns a single result
  function handleSingleResult(result: ImportResult) {
    handleResults([result])
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingHero(true)
    setHeroError(null)
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
      setHeroImageUrl(publicUrl)
      setHeroPreview(publicUrl)
    } catch (err: any) {
      setHeroError('Upload failed: ' + err.message)
    } finally {
      setUploadingHero(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ---- Review screen ------------------------------------------
  if (importResult?.success && importResult.recipe) {
    const prefill = {
      title:          importResult.recipe.title,
      source:         importResult.recipe.source,
      hero_image_url: heroImageUrl ?? importResult.recipe.hero_image_url,
      sections:       importResult.recipe.sections,
      method_steps:   importResult.recipe.method_steps,
    }

    const isMulti     = queueTotal > 1
    const currentNum  = queueIndex + 1
    const hasMore     = queueIndex < queueTotal - 1

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setImportResult(null)
              setImportQueue([])
              setQueueIndex(0)
              setQueueTotal(0)
              setHeroImageUrl(null)
              setHeroPreview(null)
            }}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            Back
          </button>
          <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Review recipe
          </h1>
          {isMulti && (
            <span className="ml-auto text-sm text-zinc-400 dark:text-zinc-500 tabular-nums">
              Importing {currentNum} of {queueTotal}
            </span>
          )}
        </div>

        {importResult.warning && (
          <div className={cn(
            'flex items-start gap-2.5 rounded-xl p-3.5 mb-5',
            'bg-amber-50 dark:bg-amber-900/20',
            'border border-amber-200 dark:border-amber-800',
          )}>
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {importResult.warning}
            </p>
          </div>
        )}

        {/* Hero photo picker */}
        <div className="mb-6">
          {heroPreview ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={heroPreview}
                alt="Recipe photo"
                className="w-full max-h-56 object-cover"
              />
              <button
                onClick={() => { setHeroImageUrl(null); setHeroPreview(null) }}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <label className={cn(
              'flex items-center gap-2.5 w-full cursor-pointer rounded-2xl px-4 py-3.5',
              'border border-dashed border-parchment-200 dark:border-slate-700',
              'hover:border-amber-300 dark:hover:border-amber-700',
              'text-sm text-zinc-500 dark:text-zinc-400',
              'transition-colors',
            )}>
              {uploadingHero
                ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" strokeWidth={1.75} />
                : <ImagePlus className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
              }
              {uploadingHero ? 'Uploading…' : 'Add a photo'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleHeroUpload}
              />
            </label>
          )}
          {heroError && (
            <p className="text-xs text-red-500 mt-1.5">{heroError}</p>
          )}
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Review and correct the extracted recipe before saving.
          {isMulti && hasMore && (
            <span className="block mt-1 text-xs">
              After saving, you'll be taken to recipe {currentNum + 1} of {queueTotal}.
            </span>
          )}
        </p>

        {/* Skip button for multi-recipe flows */}
        {isMulti && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => advanceQueue(queueIndex)}
              className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              {hasMore ? `Skip — next recipe →` : 'Skip this one'}
            </button>
          </div>
        )}

        <RecipeForm
          key={`${queueIndex}-${heroImageUrl ?? 'no-image'}`}
          categories={categories}
          tags={tags}
          prefill={prefill as any}
          isImport
          onSaved={isMulti ? () => advanceQueue(queueIndex) : undefined}
        />
      </div>
    )
  }

  // ---- Error screen -------------------------------------------
  if (importResult && !importResult.success) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setImportResult(null)}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            Back
          </button>
          <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-50">Import failed</h1>
        </div>
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{importResult.error}</p>
        </div>
      </div>
    )
  }

  // ---- Method picker + import screens -------------------------
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Back
        </Link>
        <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Import recipe
        </h1>
      </div>

      {!method ? (
        /* Method picker */
        <div className="flex flex-col gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                if (m.id === 'manual') router.push('/recipes/new')
                else setMethod(m.id)
              }}
              className={cn(
                'flex items-center gap-5 rounded-2xl p-5 text-left',
                'bg-white dark:bg-slate-850',
                'border border-parchment-200 dark:border-slate-700',
                'hover:border-amber-300 dark:hover:border-amber-700',
                'hover:shadow-card-md',
                'transition-all',
              )}
            >
              <div className="flex items-center justify-center w-14 flex-shrink-0">
                <m.icon className="h-10 w-10 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{m.label}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 leading-snug">{m.description}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Active import method */
        <div className="sm:space-y-5">
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => { setMethod(null); setImportResult(null) }}
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              Methods
            </button>
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              {METHODS.find((m) => m.id === method)?.label}
            </h2>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-850 border border-parchment-200 dark:border-slate-800 p-5">
            {method === 'file'  && <FileImport  onResults={handleResults} />}
            {method === 'photo' && <PhotoImport onResult={handleSingleResult} />}
          </div>
        </div>
      )}
    </div>
  )
}
