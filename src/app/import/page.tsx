'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Camera, FileText, PenLine, ChevronLeft, AlertTriangle, ImagePlus, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { URLImport }   from '@/components/import/URLImport'
import { PhotoImport } from '@/components/import/PhotoImport'
import { PDFImport }   from '@/components/import/PDFImport'
import { RecipeForm }  from '@/components/recipe/RecipeForm'
import { createClient } from '@/lib/supabase/client'
import type { ImportMethod, ImportResult, Category, Tag } from '@/types'
import Link from 'next/link'

const METHODS: { id: ImportMethod; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'url',    label: 'From URL',   icon: Link2,    description: 'Paste a link to any recipe page' },
  { id: 'photo',  label: 'Photo',      icon: Camera,   description: 'Take or upload a photo of a recipe' },
  { id: 'pdf',    label: 'PDF',        icon: FileText,  description: 'Upload a PDF — digital or scanned' },
  { id: 'manual', label: 'Manual',     icon: PenLine,  description: 'Enter recipe details from scratch' },
]

export default function ImportPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [method, setMethod]               = useState<ImportMethod | null>(null)
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

  function handleResult(result: ImportResult) {
    setImportResult(result)
    setHeroImageUrl(result.recipe?.hero_image_url ?? null)
    setHeroPreview(result.recipe?.hero_image_url ?? null)
    if (!result.success) return
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  // If we have a successful import, show the review/edit form
  if (importResult?.success && importResult.recipe) {
    const prefill = {
      title:          importResult.recipe.title,
      source:         importResult.recipe.source,
      hero_image_url: heroImageUrl ?? importResult.recipe.hero_image_url,
      sections:       importResult.recipe.sections,
      method_steps:   importResult.recipe.method_steps,
    }
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setImportResult(null); setHeroImageUrl(null); setHeroPreview(null) }}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            Back
          </button>
          <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Review recipe
          </h1>
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
        </p>

        <RecipeForm
          key={heroImageUrl ?? 'no-image'}
          categories={categories}
          tags={tags}
          prefill={prefill as any}
          isImport
        />
      </div>
    )
  }

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
        <div className="grid grid-cols-2 gap-3">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                if (m.id === 'manual') router.push('/recipes/new')
                else setMethod(m.id)
              }}
              className={cn(
                'flex flex-col items-start gap-2 rounded-2xl p-5 text-left',
                'bg-white dark:bg-slate-850',
                'border border-parchment-200 dark:border-slate-700',
                'hover:border-amber-300 dark:hover:border-amber-700',
                'hover:shadow-card-md',
                'transition-all',
              )}
            >
              <m.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{m.label}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 leading-snug">{m.description}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Active import method */
        <div className="space-y-5">
          <div className="flex items-center gap-3">
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
            {method === 'url'   && <URLImport   onResult={handleResult} />}
            {method === 'photo' && <PhotoImport onResult={handleResult} />}
            {method === 'pdf'   && <PDFImport   onResult={handleResult} />}
          </div>
        </div>
      )}
    </div>
  )
}
