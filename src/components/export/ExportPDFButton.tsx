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
  title:    string
  recipes:  Recipe[]
  disabled?: boolean
  darkMode: boolean
  mode:     ExportMode
}

// ---- Chalk font loader ---------------------------------------------
// Cabin Sketch (Google Fonts) is the closest freely available web font
// to Chalkduster. Fetched via browser fetch → Blob URL so react-pdf
// receives binary font data directly, avoiding the "unknown font format"
// error that occurs when react-pdf tries to fetch a URL itself.

const CHALK_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/cabinsketch/CabinSketch-Regular.ttf'

let fontState: 'idle' | 'loading' | 'loaded' | 'failed' = 'idle'
let fontLoadPromise: Promise<void> | null = null

function loadChalkFont(): Promise<void> {
  if (fontState === 'loaded') return Promise.resolve()
  if (fontLoadPromise)        return fontLoadPromise

  fontState = 'loading'
  fontLoadPromise = (async () => {
    try {
      const resp = await fetch(CHALK_URL)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const buf  = await resp.arrayBuffer()
      const blob = new Blob([buf], { type: 'font/truetype' })
      const url  = URL.createObjectURL(blob)
      Font.register({ family: CHALK_FONT_FAMILY, src: url })
      fontState = 'loaded'
    } catch {
      // Register fallback so react-pdf never references an unregistered family
      Font.register({ family: CHALK_FONT_FAMILY, src: undefined as any, fonts: [] })
      fontState = 'failed'
    }
  })()

  return fontLoadPromise
}

// ---- Component -----------------------------------------------------

export function ExportPDFButton({ title, recipes, disabled, darkMode, mode }: Props) {
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleExport() {
    if (recipes.length === 0) return
    setGenerating(true)
    setError(null)
    try {
      // Ensure chalk font is registered before the PDF renderer starts
      await loadChalkFont()

      const doc = mode === 'menu'
        ? <MenuPDF title={title} recipes={recipes} />
        : <RecipeBookPDF title={title} recipes={recipes} darkMode={darkMode} />

      const blob = await pdf(doc).toBlob()

      const slug     = (title.trim() || (mode === 'menu' ? 'Menu' : 'Recipe Book'))
        .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
      const filename = slug + '.pdf'

      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (e: any) {
      setError(e?.message ?? 'PDF generation failed')
    } finally {
      setGenerating(false)
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
          <><Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={1.75} />Generating PDF…</>
        ) : (
          <><Download className="h-4 w-4 mr-2" strokeWidth={1.75} />Export PDF</>
        )}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
