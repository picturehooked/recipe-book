import { NextRequest, NextResponse } from 'next/server'
import { parseOcrText } from '@/lib/utils/ocr-parser'
import type { ImportResult, ImportedRecipe } from '@/types'

// Timeout for external fetch
const FETCH_TIMEOUT_MS = 10_000

export async function POST(req: NextRequest): Promise<NextResponse<ImportResult>> {
  const { url } = await req.json().catch(() => ({ url: '' }))

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ success: false, error: 'No URL provided' }, { status: 400 })
  }

  // Basic URL validation
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid URL' }, { status: 400 })
  }

  // Fetch the page
  let html: string
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control':   'no-cache',
        'Pragma':          'no-cache',
        'Sec-Fetch-Dest':  'document',
        'Sec-Fetch-Mode':  'navigate',
        'Sec-Fetch-Site':  'none',
      },
    })
    clearTimeout(timer)

    if (!res.ok) {
      throw new Error(`Site returned ${res.status}`)
    }

    html = await res.text()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json({
        success: false,
        error: 'The site took too long to respond. Try uploading a photo or PDF instead.',
      })
    }
    return NextResponse.json({
      success: false,
      error: `Could not access the page: ${err.message}. Try a different import method.`,
    })
  }

  // ---- Structured data extraction (JSON-LD) ----------------
  const jsonLdMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      try {
        const json = JSON.parse(block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim())

        // Flatten: handle top-level array, @graph wrapper, or plain object
        let candidates: any[] = []
        if (Array.isArray(json)) {
          candidates = json
        } else if (json['@graph'] && Array.isArray(json['@graph'])) {
          candidates = json['@graph']
        } else {
          candidates = [json]
        }

        // Also expand any nested @graph arrays inside individual candidates
        const flat: any[] = []
        for (const c of candidates) {
          if (c['@graph'] && Array.isArray(c['@graph'])) {
            flat.push(...c['@graph'])
          } else {
            flat.push(c)
          }
        }

        const isRecipe = (s: any) =>
          s['@type'] === 'Recipe' ||
          (Array.isArray(s['@type']) && s['@type'].includes('Recipe'))

        const recipe = flat.find(isRecipe)
        if (recipe) {
          return NextResponse.json({ success: true, recipe: extractFromJsonLd(recipe) })
        }
      } catch { continue }
    }
  }

  // ---- OpenGraph / meta title + text extraction ------------
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)

  const imageMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)

  // Strip all HTML tags and extract visible text
  const visibleText = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (visibleText.length < 50) {
    return NextResponse.json({
      success: false,
      error: 'The page content could not be extracted. This site may block automated access. Try uploading a photo or PDF.',
    })
  }

  const parsed = parseOcrText(visibleText)

  // Override title and image with meta data if OCR didn't find them
  if (titleMatch?.[1]) {
    parsed.title = decodeHTMLEntities(titleMatch[1].trim())
  }
  if (imageMatch?.[1] && !parsed.hero_image_url) {
    parsed.hero_image_url = imageMatch[1]
  }
  parsed.source = url

  return NextResponse.json({
    success: true,
    recipe:  parsed,
    warning: 'This site does not provide structured recipe data — please review the extracted content carefully.',
  })
}

// ---- JSON-LD Recipe extraction ----------------------------

function extractFromJsonLd(recipe: any): ImportedRecipe {
  const title       = recipe.name ?? 'Untitled Recipe'
  const servings    = parseServings(recipe.recipeYield)
  const image       = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image
  const imageUrl    = typeof image === 'string' ? image : image?.url

  // Ingredients
  const rawIngredients: string[] = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient
    : []

  const { parseOcrText } = require('@/lib/utils/ocr-parser')

  // Parse ingredient lines individually for clean extraction
  const ingredientText = ['Ingredients', ...rawIngredients].join('\n')
  const parsed = parseOcrText(ingredientText)

  // Method steps
  const instructions = Array.isArray(recipe.recipeInstructions)
    ? recipe.recipeInstructions
    : []

  const steps: string[] = instructions
    .slice(0, 10)
    .map((step: any) => {
      const text = typeof step === 'string' ? step : step.text ?? ''
      // Condense to ~2 lines
      const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
      return sentences.slice(0, 2).join(' ').trim().slice(0, 240)
    })
    .filter(Boolean)

  return {
    title:          decodeHTMLEntities(title),
    servings,
    hero_image_url: imageUrl,
    source:         recipe.url,
    sections:       parsed.sections,
    method_steps:   steps,
  }
}

function parseServings(yield_: any): number | undefined {
  if (!yield_) return undefined
  const str = Array.isArray(yield_) ? yield_[0] : yield_
  const n = parseInt(str)
  return isNaN(n) ? undefined : n
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
