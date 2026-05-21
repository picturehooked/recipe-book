'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload, Loader2, Image as ImageIcon, X, RotateCcw, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { parseOcrText } from '@/lib/utils/ocr-parser'
import type { ImportResult } from '@/types'

interface PhotoImportProps {
  onResult: (result: ImportResult) => void
}

/**
 * Rotate the image by `degrees` and apply grayscale + contrast boost.
 * This replicates the basic document-scan processing a phone's text/scan
 * mode does before OCR, improving Tesseract accuracy on uneven lighting.
 */
async function prepareImageForOcr(source: File | Blob, degrees: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(source)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx    = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas 2D context not available'))
        return
      }
      const rad = (degrees * Math.PI) / 180
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

      // Grayscale + contrast boost — improves Tesseract accuracy on photos
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const gray    = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
        const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.8 + 128))
        d[i] = d[i + 1] = d[i + 2] = boosted
      }
      ctx.putImageData(imageData, 0, 0)

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        0.92,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

export function PhotoImport({ onResult }: PhotoImportProps) {
  const [file, setFile]             = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [rotation, setRotation]     = useState(0)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [status, setStatus]         = useState<string>('')

  const videoRef        = useRef<HTMLVideoElement>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const nativeCameraRef = useRef<HTMLInputElement>(null)

  // Attach stream to video element once the camera UI has mounted
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [cameraOpen])

  // Stop any active stream on unmount
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

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

  // ---- Camera ----------------------------------------------------------

  async function openCamera() {
    // Try in-app camera first; fall back to native <input capture> if unavailable
    if (!navigator.mediaDevices?.getUserMedia) {
      nativeCameraRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
    } catch {
      // Permission denied or device unavailable — use native camera
      nativeCameraRef.current?.click()
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  async function captureFromCamera() {
    if (!videoRef.current) return
    const video = videoRef.current

    // Draw current frame to canvas
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    // Store the original frame as preview so the user can see what was captured
    const originalBlob = await new Promise<Blob>(res =>
      canvas.toBlob(b => res(b!), 'image/jpeg', 0.9),
    )
    const capturedFile = new File([originalBlob], 'camera-capture.jpg', { type: 'image/jpeg' })
    setFile(capturedFile)
    setPreview(URL.createObjectURL(capturedFile))
    setRotation(0)
    closeCamera()

    // Pre-process and run OCR immediately — no Extract button press needed
    const processedBlob = await prepareImageForOcr(capturedFile, 0)
    await runOcr(processedBlob)
  }

  // ---- OCR pipeline ----------------------------------------------------

  async function runOcr(blob: File | Blob) {
    setProcessing(true)
    setProgress(0)
    setStatus('Loading OCR engine…')
    try {
      // tesseract.js is a CJS module — use named import, not .default
      const { recognize } = await import('tesseract.js')
      setStatus('Recognising text…')
      setProgress(10)
      const { data: { text: rawText } } = await recognize(blob, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setProgress(10 + Math.round(m.progress * 70))
          }
        },
      })
      setProgress(85)
      setStatus('Parsing recipe…')
      const parsed = parseOcrText(rawText)
      setProgress(100)
      setStatus('Done')
      onResult({
        success: true,
        recipe:  parsed,
        warning: rawText.length < 100
          ? 'Very little text was extracted — try holding the camera closer and ensuring good lighting. If the text is sideways, use the rotate buttons.'
          : undefined,
      })
    } catch (err: any) {
      onResult({ success: false, error: err.message ?? 'OCR failed' })
    } finally {
      setProcessing(false)
    }
  }

  async function handleExtract() {
    if (!file) return
    const processedBlob = await prepareImageForOcr(file, rotation)
    await runOcr(processedBlob)
  }

  function clearFile() {
    setFile(null)
    setPreview(null)
    setRotation(0)
    setProgress(0)
    setStatus('')
  }

  // ---- Render ----------------------------------------------------------

  // In-app camera viewfinder
  if (cameraOpen) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-80 object-contain"
          />
          <button
            onClick={closeCamera}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
          Point at the recipe text and tap Capture
        </p>
        <Button onClick={captureFromCamera} className="w-full">
          <Camera className="h-4 w-4 mr-2" strokeWidth={1.75} />
          Capture &amp; scan
        </Button>
      </div>
    )
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
              <button
                onClick={openCamera}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3.5 py-2',
                  'text-sm font-medium',
                  'bg-parchment-100 dark:bg-slate-800',
                  'text-zinc-600 dark:text-zinc-300',
                  'border border-parchment-200 dark:border-slate-700',
                )}
              >
                <Camera className="h-4 w-4" strokeWidth={1.75} />
                Take photo
              </button>
              {/* Hidden native camera input — fallback when getUserMedia is unavailable */}
              <input
                ref={nativeCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setNewFile(f)
                }}
              />
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
