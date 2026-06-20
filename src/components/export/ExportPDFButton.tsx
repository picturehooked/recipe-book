'use client'

import React, { useState } from 'react'
import { pdf, Font } from '@react-pdf/renderer'
import { RecipeBookPDF, CHALK_FONT_FAMILY } from './RecipeBookPDF'
import { MenuPDF } from './MenuPDF'
import { Button } from '@/components/ui/Button'
import { Download, Loader2 } from 'lucide-react'
import type { Recipe } from '@/types'

export type ExportMode = 'cookbook' | 'menu'

interface Props {
  title:     string
  recipes:   Recipe[]
  disabled?: boolean
  darkMode:  boolean
  mode:      ExportMode
}

// ---- Chalk font loader ---------------------------------------------
const CHALK_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/cabinsketch/CabinSketch-Regular.ttf'

let fontState: 'idle' | 'loading' | 'loaded' | 'failed' = 'idle'
let fontLoadPromise: Promise<void> | null = null

function loadChalkFont(): Promise<void> {
  if (fontState === 'loaded') return Promise.resolve()
  if (fontLoadPromise) return fontLoadPromise
  fontState = 'loading'
  fontLoadPromise = (async () => {
    try {
      const resp = await fetch(CHALK_URL)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const buf  = await resp.arrayBuffer()
      const blob = new Blob([buf], { type: 'font/truetype' })
      Font.register({ family: CHALK_FONT_FAMILY, src: URL.createObjectURL(blob) })
      fontState = 'loaded'
    } catch {
      // Fallback: register a built-in family name under our custom key
      // react-pdf will use Helvetica if no file is registered
      fontState = 'failed'
    }
  })()
  return fontLoadPromise
}

// ---- Image pre-processor -------------------------------------------
// react-pdf v3 only supports JPEG, PNG, and GIF.
// WebP, AVIF, HEIC etc. are silently dropped, causing missing images.
// Solution: fetch every image through the browser, detect the format,
// and convert unsupported formats to JPEG via HTMLCanvasElement before
// passing the recipes to the PDF renderer.

const SUPPORTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']

async function toJpegDataUrl(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob)
  const MAX = 1400
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height, 1))
  const canvas = document.createElement('canvas')
  canvas.width  = Math.round(bitmap.width  * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.88)
}

async function processImages(recipes: Recipe[]): Promise<Recipe[]> {
  const urls = Array.from(new Set(
    recipes.map(r => r.hero_image_url).filter((u): u is string => !!u)
  ))
  if (urls.length === 0) return recipes

  const converted = new Map<string, string>()

  await Promise.allSettled(urls.map(async url => {
    try {
      const resp = await fetch(url, { mode: 'cors' })
      if (!resp.ok) return
      const blob = await resp.blob()
      if (!SUPPORTED.some(t => blob.type.startsWith(t.split('/')[0]) && blob.type.includes(t.split('/')[1]))) {
        // Unsupported format (WebP, AVIF, HEIC…) — convert to JPEG
        converted.set(url, await toJpegDataUrl(blob))
      }
      // JPEG / PNG / GIF: react-pdf fetches these fine — no action needed
    } catch {
      // Leave original URL; react-pdf will attempt it and may show a blank
    }
  }))

  if (converted.size === 0) return recipes

  return recipes.map(r => ({
    ...r,
    hero_image_url: (r.hero_image_url && converted.has(r.hero_image_url))
      ? converted.get(r.hero_image_url)!
      : r.hero_image_url,
  }))
}

// ---- Component -----------------------------------------------------

export function ExportPDFButton({ title, recipes, disabled, darkMode, mode }: Props) {
  const [status,     setStatus]     = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  const generating = status !== null

  async function handleExport() {
    if (recipes.length === 0) return
    setError(null)
    try {
      setStatus('Loading font…')
      await loadChalkFont()

      setStatus('Preparing images…')
      const processedRecipes = await processImages(recipes)

      setStatus('Generating PDF…')
      const doc = mode === 'menu'
        ? <MenuPDF title={title} recipes={processedRecipes} />
        : <RecipeBookPDF title={title} recipes={processedRecipes} darkMode={darkMode} />

      const blob = await pdf(doc).toBlob()

      const slug     = (title.trim() || (mode === 'menu' ? 'Menu' : 'Recipe Book'))
        .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href = url; a.download = slug + '.pdf'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (e: any) {
      setError(e?.message ?? 'PDF generation failed')
    } finally {
      setStatus(null)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleExport}
        disabled={disabled || generating || recipes.length === 0}
        className="w-full sm:w-auto"
      >
        {generating ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={1.75} />{status}</>
        ) : (
          <><Download className="h-4 w-4 mr-2" strokeWidth={1.75} />Export PDF</>
        )}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
