'use client'

import { useState } from 'react'
import { Link2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import type { ImportResult } from '@/types'

interface URLImportProps {
  onResult: (result: ImportResult) => void
}

export function URLImport({ onResult }: URLImportProps) {
  const [url, setUrl]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleImport() {
    if (!url.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/import/url', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: url.trim() }),
      })

      const data: ImportResult = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Import failed')
      }

      onResult(data)
    } catch (err: any) {
      setError(err.message)
      onResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Recipe URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" strokeWidth={1.75} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              placeholder="https://www.bbcgoodfood.com/recipes/…"
              className={cn(
                'w-full pl-9 pr-3.5 py-2.5 rounded-xl',
                'text-sm text-zinc-900 dark:text-zinc-100',
                'bg-white dark:bg-slate-850',
                'border border-parchment-200 dark:border-slate-700',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
              )}
            />
          </div>
          <Button
            onClick={handleImport}
            disabled={!url.trim() || loading}
            loading={loading}
          >
            Import
          </Button>
        </div>
      </div>

      {error && (
        <div className={cn(
          'flex items-start gap-2.5 rounded-xl p-3.5',
          'bg-red-50 dark:bg-red-900/20',
          'border border-red-200 dark:border-red-800',
        )}>
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Could not import recipe
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-1.5">
              Try uploading a photo or PDF of the recipe instead, or enter it manually.
            </p>
          </div>
        </div>
      )}

      <div className="text-xs text-zinc-400 dark:text-zinc-500 space-y-1">
        <p>Works with most recipe websites. The recipe will open for review before saving.</p>
        <p>If the site blocks extraction, use Photo or PDF import instead.</p>
      </div>
    </div>
  )
}
