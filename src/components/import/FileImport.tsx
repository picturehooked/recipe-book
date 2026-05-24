'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { parseOcrText, splitIntoRecipes } from '@/lib/utils/ocr-parser'
import { createClient } from '@/lib/supabase/client'
import type { ImportResult } from '@/types'

interface FileImportProps {
  onResults: (results: ImportResult[]) => void
}

export function FileImport({ onResults }: FileImportProps) {
  const [file, setFile]             = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [status, setStatus]         = useState('')

  const supabase = createClient()

  const onDrop = useCallback((accepted: File[]) => {
    setFile(accepted[0] ?? null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf':                                                             ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':   ['.docx'],
      'application/msword':                                                         ['.doc'],
    },
    maxSize: 20_000_000,
    multiple: false,
  })

  // ---- Upload a base64 data URI to Supabase Storage -----------
  // Returns the public URL, or null if the upload fails (non-fatal).
  async function uploadDataUri(dataUri: string): Promise<string | null> {
    try {
      const res  = await fetch(dataUri)
      const blob = await res.blob()
      const ext  = blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
      const path = `recipes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(path, blob, { upsert: true })
      if (error || !data) return null
      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(data.path)
      return publicUrl
    } catch {
      return null
    }
  }

  // ---- Extract text + images from a Word document -------------
  // mammoth.convertToHtml embeds images as base64 data URIs by default.
  // We replace each <img> tag with a positional placeholder (__IMAGE_N__) so
  // the placeholder travels with its surrounding text through the recipe splitter.
  // This lets us assign each recipe its nearest image rather than guessing by index.
  async function extractDocxContent(file: File): Promise<{ text: string; images: string[] }> {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()

    const result = await mammoth.convertToHtml({ arrayBuffer })
    const html   = result.value

    // Replace each <img src="data:..."> with __IMAGE_N__ and collect data URIs
    const images: string[] = []
    const htmlWithPlaceholders = html.replace(
      /<img[^>]+src="(data:[^"]+)"[^>]*\/?>/g,
      (_, dataUri: string) => {
        const idx = images.length
        images.push(dataUri)
        return `\n__IMAGE_${idx}__\n`
      },
    )

    // Extract plain text, keeping __IMAGE_N__ placeholders intact
    const text = htmlWithPlaceholders
      .replace(/<\/?(p|h[1-6]|li|br)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      // Normalise non-breaking spaces — Word uses \xa0 between quantities and units
      .replace(/ /g, ' ')

    return { text, images }
  }

  // ---- Extract text from a PDF --------------------------------
  async function extractPdfText(
    file: File,
    onProgress: (pct: number, msg: string) => void,
  ): Promise<string> {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
    const pdf = await loadingTask.promise
    onProgress(20, 'Scanning pages…')

    let fullText = ''
    const pageCount = Math.min(pdf.numPages, 10)

    for (let i = 1; i <= pageCount; i++) {
      onProgress(20 + Math.round((i / pageCount) * 40), `Reading page ${i} of ${pageCount}…`)
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .filter((item: any) => typeof item.str === 'string')
        .map((item: any) => item.str + (item.hasEOL ? '\n' : ''))
        .join('')
      fullText += pageText + '\n'
    }

    // Fall back to OCR if text extraction is minimal
    if (fullText.trim().length < 100) {
      onProgress(65, 'Low text — running OCR…')
      const { recognize } = await import('tesseract.js')
      const page     = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 2 })
      const canvas   = document.createElement('canvas')
      canvas.width   = viewport.width
      canvas.height  = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport }).promise
      const { data: { text } } = await recognize(canvas, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            onProgress(65 + Math.round(m.progress * 25), 'Running OCR…')
          }
        },
      })
      fullText = text
    }

    return fullText
  }

  async function handleExtract() {
    if (!file) return
    setProcessing(true)
    setProgress(5)
    setStatus('Reading file…')

    try {
      const isPdf  = file.name.toLowerCase().endsWith('.pdf')
      const isDocx = file.name.toLowerCase().match(/\.docx?$/)

      let fullText = ''
      let docxImages: string[] = []

      if (isPdf) {
        fullText = await extractPdfText(file, (pct, msg) => {
          setProgress(pct)
          setStatus(msg)
        })
      } else if (isDocx) {
        setProgress(30)
        setStatus('Extracting content from document…')
        const { text, images } = await extractDocxContent(file)
        fullText    = text
        docxImages  = images
        setProgress(60)
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or Word document.')
      }

      setProgress(70)
      setStatus('Detecting recipes…')
      // chunks may contain __IMAGE_N__ placeholders for docx files
      const chunks = splitIntoRecipes(fullText)

      setProgress(80)
      setStatus(`Parsing ${chunks.length} recipe${chunks.length === 1 ? '' : 's'}…`)
      // Strip image placeholders before passing text to the parser
      const parsed = chunks.map(chunk => parseOcrText(chunk.replace(/__IMAGE_\d+__/g, '')))

      // Match images to recipes by placeholder position (docx only).
      // Each chunk may contain an __IMAGE_N__ marker; use the first one found
      // as the hero image for that recipe. This is position-aware and avoids
      // the index-mismatch bug where image N is assigned to recipe N regardless
      // of where the image actually appeared in the document.
      let heroUrls: (string | null)[] = new Array(parsed.length).fill(null)
      if (docxImages.length > 0) {
        const matchedDataUris: (string | null)[] = chunks.map(chunk => {
          const m = chunk.match(/__IMAGE_(\d+)__/)
          if (!m) return null
          return docxImages[Number(m[1])] ?? null
        })
        setProgress(85)
        setStatus('Uploading images…')
        heroUrls = await Promise.all(
          matchedDataUris.map(uri => uri ? uploadDataUri(uri) : Promise.resolve(null))
        )
      }

      setProgress(100)
      setStatus('Done')

      const results: ImportResult[] = parsed.map((recipe, i) => ({
        success: true,
        recipe: {
          ...recipe,
          ...(heroUrls[i] ? { hero_image_url: heroUrls[i]! } : {}),
        },
      }))

      onResults(results)
    } catch (err: any) {
      onResults([{ success: false, error: err.message ?? 'File extraction failed' }])
    } finally {
      setProcessing(false)
    }
  }

  const isPdf  = file?.name.toLowerCase().endsWith('.pdf')
  const isDocx = file?.name.toLowerCase().match(/\.docx?$/)

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
                Drop a file here, or tap to browse
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                PDF or Word document (.pdf, .docx) — one or multiple recipes
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
              {(file.size / 1024 / 1024).toFixed(1)} MB &middot; {isPdf ? 'PDF' : isDocx ? 'Word document' : 'Document'}
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
          Extract from file
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
        PDF and Word documents supported. Multiple recipes are imported individually.
        Images embedded in Word documents are attached automatically.
        Scanned PDFs run OCR on-device.
      </p>
    </div>
  )
}
