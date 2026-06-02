'use client'

import React, { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { RecipeBookPDF } from './RecipeBookPDF'
import { Button } from '@/components/ui/Button'
import { Download, Loader2 } from 'lucide-react'
import type { Recipe } from '@/types'

interface ExportPDFButtonProps {
  title:    string
  recipes:  Recipe[]
  disabled?: boolean
}

export function ExportPDFButton({ title, recipes, disabled }: ExportPDFButtonProps) {
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleExport() {
    if (recipes.length === 0) return
    setGenerating(true)
    setError(null)
    try {
      const blob = await pdf(
        <RecipeBookPDF title={title} recipes={recipes} />
      ).toBlob()

      const url      = URL.createObjectURL(blob)
      const filename = (title.trim() || 'Recipe Book')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_') + '.pdf'

      const a = document.createElement('a')
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
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={1.75} />
            Generating PDF…
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" strokeWidth={1.75} />
            Export PDF
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
