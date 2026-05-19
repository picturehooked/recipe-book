'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { parseOcrText } from '@/lib/utils/ocr-parser'
import type { ImportResult } from '@/types'

interface PDFImportProps {
  onResult: (result: ImportResult) => void
}

export function PDFImport({ onResult }: PDFImportProps) {
  const [file, setFile]           = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [status, setStatus]       = useState('')

  const onDrop = useCallback((accepted: File[]) => {
    setFile(accepted[0] ?? null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 20_000_000,
    multiple: false,
  })

  async function handleExtract() {
    if (!file) return
    setProcessing(true)
    setProgress(5)
    setStatus('Loading PDF…')

    try {
      // Dynamic import to avoid SSR
      const pdfjs = await import('pdfjs-dist')
      // pdfjs-dist v4 uses .mjs worker
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdf = await loadingTask.promise
      setProgress(20)

      let fullText = ''
      // Process first 3 pages (typically enough for one recipe)
      const pageCount = Math.min(pdf.numPages, 3)

      for (let i = 1; i <= pageCount; i++) {
        setStatus(`Reading page ${i} of ${pageCount}…`)
        const page    = await pdf.getPage(i)
        const content = await page.getTextContent()
        // Filter out TextMarkedContent items (no .str property) present in pdfjs v4
        const pageText = content.items
          .filter((item: any) => typeof item.str === 'string')
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n'
        setProgress(20 + Math.round((i / pageCount) * 40))
      }

      // If text extraction is minimal, fall back to OCR on first page
      if (fullText.trim().length < 100) {
        setStatus('Low text content — running OCR…')
        setProgress(65)

        const Tesseract = (await import('tesseract.js')).default

        // Render first page to canvas for OCR
        const page    = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 2 })
        const canvas  = document.createElement('canvas')
        canvas.width  = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise

        const ocrResult = await Tesseract.recognize(canvas, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(65 + Math.round(m.progress * 25))
            }
          },
        })
        fullText = ocrResult.data.text
      }

      setProgress(90)
      setStatus('Parsing recipe…')

      const parsed = parseOcrText(fullText)
      setProgress(100)
      setStatus('Done')

      onResult({ success: true, recipe: parsed })
    } catch (err: any) {
      onResult({ success: false, error: err.message ?? 'PDF extraction failed' })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            'rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/10'
              : 'border-parchment-200 dark:border-slate-700 hover:border-parchment-300 dark:hover:border-slate-600',
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Drop a PDF here, or tap to browse
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Scanned pages, handwritten recipes, or digital PDFs
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-parchment-200 dark:border-slate-700 p-4 flex items-center gap-3">
          <FileText className="h-8 w-8 text-amber-500 flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
              {file.name}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            onClick={() => { setFile(null); setProgress(0); setStatus('') }}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}

      {file && !processing && (
        <Button onClick={handleExtract} className="w-full">
          Extract recipe from PDF
        </Button>
      )}

      {processing && (
        <div className="space-y-2">
          <div className="h-1.5 w-full rounded-full bg-parchment-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            {status}
          </p>
        </div>
      )}

      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Supports digital and scanned PDFs. For scanned pages, OCR runs on-device.
        The extracted recipe opens for review before saving.
      </p>
    </div>
  )
}
