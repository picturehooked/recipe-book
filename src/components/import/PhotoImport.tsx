'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload, Loader2, Image as ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { parseOcrText } from '@/lib/utils/ocr-parser'
import type { ImportResult } from '@/types'

interface PhotoImportProps {
  onResult: (result: ImportResult) => void
}

export function PhotoImport({ onResult }: PhotoImportProps) {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus]     = useState<string>('')

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 20_000_000,
    multiple: false,
  })

  async function handleExtract() {
    if (!file) return
    setProcessing(true)
    setProgress(0)
    setStatus('Loading OCR engine…')

    try {
      // Dynamically import Tesseract to avoid SSR issues.
      // Use explicit CDN paths for worker/core so it works in production.
      const { createWorker } = await import('tesseract.js')

      setStatus('Loading OCR engine…')
      setProgress(5)

      const worker = await createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
        corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
        langPath:   'https://tessdata.projectnaptha.com/4.0.0',
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setProgress(10 + Math.round(m.progress * 70))
          }
        },
      })

      setStatus('Recognising text…')
      setProgress(10)

      const { data: { text: rawText } } = await worker.recognize(file)
      await worker.terminate()

      setProgress(85)
      setStatus('Parsing recipe…')
      const parsed  = parseOcrText(rawText)

      setProgress(100)
      setStatus('Done')

      onResult({
        success: true,
        recipe:  parsed,
        warning: rawText.length < 100
          ? 'Low text extracted — the photo may be unclear. Please review carefully.'
          : undefined,
      })
    } catch (err: any) {
      onResult({ success: false, error: err.message ?? 'OCR failed' })
    } finally {
      setProcessing(false)
    }
  }

  function clearFile() {
    setFile(null)
    setPreview(null)
    setProgress(0)
    setStatus('')
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
            <div className="flex gap-3">
              <Camera className="h-8 w-8 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
              <Upload className="h-8 w-8 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Drop a photo here, or tap to browse
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Handwritten recipes, magazine pages, screenshots — JPG, PNG, HEIC
              </p>
            </div>
            {/* Camera button for mobile */}
            <div className="flex gap-2 mt-1">
              <label className={cn(
                'cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5 py-2',
                'text-sm font-medium',
                'bg-parchment-100 dark:bg-slate-800',
                'text-zinc-600 dark:text-zinc-300',
                'border border-parchment-200 dark:border-slate-700',
              )}>
                <Camera className="h-4 w-4" strokeWidth={1.75} />
                Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) { setFile(f); setPreview(URL.createObjectURL(f)) }
                  }}
                />
              </label>
              <label className={cn(
                'cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5 py-2',
                'text-sm font-medium',
                'bg-parchment-100 dark:bg-slate-800',
                'text-zinc-600 dark:text-zinc-300',
                'border border-parchment-200 dark:border-slate-700',
              )}>
                <ImageIcon className="h-4 w-4" strokeWidth={1.75} />
                Photo library
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) { setFile(f); setPreview(URL.createObjectURL(f)) }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={preview!}
              alt="Recipe to import"
              className="w-full max-h-64 object-contain bg-parchment-50 dark:bg-slate-800"
            />
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Progress */}
          {processing && (
            <div className="space-y-1.5">
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

          <Button
            onClick={handleExtract}
            disabled={processing}
            loading={processing}
            className="w-full"
          >
            {processing ? 'Extracting recipe…' : 'Extract recipe from photo'}
          </Button>
        </div>
      )}

      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Text recognition runs on-device. Your photo is never uploaded for OCR.
        The extracted recipe will open for review before saving.
      </p>
    </div>
  )
}
