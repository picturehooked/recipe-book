'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload, Loader2, Image as ImageIcon, X, RotateCcw, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { parseOcrText } from '@/lib/utils/ocr-parser'
import type { ImportResult } from '@/types'

interface PhotoImportProps {
  onResult: (result: ImportResult) => void
}

// Canvas-rotate an image file by the given degrees (must be a multiple of 90).
// Returns a JPEG Blob with corrected dimensions ready for Tesseract.
async function applyCanvasRotation(file: File, degrees: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx    = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas 2D context not available'))
        return
      }
      const rad = (degrees * Math.PI) / 180
      // Swap dimensions for 90° / 270° so the canvas fits the rotated image
      if (degrees === 90 || degrees === 270) {
        canvas.width  = img.naturalHeight
        canvas.height = img.naturalWidth
      } else {
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
      }
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(rad)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        0.92,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image failed to load')) }
    img.src = url
  })
}

export function PhotoImport({ onResult }: PhotoImportProps) {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus]     = useState<string>('')

  function setNewFile(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setRotation(0)
  }

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setNewFile(f)
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
      // tesseract.js is a CJS module — use named import, not .default
      const { recognize } = await import('tesseract.js')

      // Canvas-rotate before OCR when the user has corrected orientation
      const imageSource = rotation !== 0
        ? await applyCanvasRotation(file, rotation)
        : file

      setStatus('Recognising text…')
      setProgress(10)

      const { data: { text: rawText } } = await recognize(imageSource, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setProgress(10 + Math.round(m.progress * 70))
          }
        },
      })

      setProgress(85)
      setStatus('Parsing recipe…')
      const parsed  = parseOcrText(rawText)

      setProgress(100)
      setStatus('Done')

      onResult({
        success: true,
        recipe:  parsed,
        warning: rawText.length < 100
          ? 'Very little text was extracted — the photo may be sideways or unclear. Use the rotate buttons to correct orientation and try again.'
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
    setRotation(0)
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
            {/* Camera / library buttons — stopPropagation prevents the dropzone's own
                click handler from firing a second file picker on top of these */}
            <div className="flex gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
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
                    if (f) setNewFile(f)
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
                    if (f) setNewFile(f)
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden bg-parchment-50 dark:bg-slate-800">
            <div className="flex items-center justify-center min-h-48 p-2">
              <img
                src={preview!}
                alt="Recipe to import"
                className="max-w-full max-h-64 object-contain transition-transform duration-200"
                style={{ transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined }}
              />
            </div>
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Rotation controls */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Text sideways? Rotate before extracting.
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                disabled={processing}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                  'bg-parchment-100 dark:bg-slate-800 border border-parchment-200 dark:border-slate-700',
                  'text-zinc-600 dark:text-zinc-300 hover:border-amber-300 dark:hover:border-amber-700',
                  'disabled:opacity-40 transition-colors',
                )}
                title="Rotate counter-clockwise 90°"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                CCW
              </button>
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                disabled={processing}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                  'bg-parchment-100 dark:bg-slate-800 border border-parchment-200 dark:border-slate-700',
                  'text-zinc-600 dark:text-zinc-300 hover:border-amber-300 dark:hover:border-amber-700',
                  'disabled:opacity-40 transition-colors',
                )}
                title="Rotate clockwise 90°"
              >
                <RotateCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                CW
              </button>
            </div>
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
