// ============================================================
// OCR / raw text → structured recipe parser
// ============================================================
// Aggressive extraction: only ingredients, title, up to 10 steps.
// Strips blog content, stories, and commentary.
// ============================================================

import type { ImportedRecipe, IngredientSectionInput, RecipeIngredientInput } from '@/types'
import { parseQuantity } from './formatters'

const UNIT_ALIASES: Record<string, string> = {
  'grams': 'g', 'gram': 'g',
  'kilograms': 'kg', 'kilogram': 'kg',
  'millilitres': 'ml', 'millilitre': 'ml', 'milliliters': 'ml', 'milliliter': 'ml',
  'litres': 'l', 'litre': 'l', 'liter': 'l', 'liters': 'l',
  'teaspoon': 'tsp', 'teaspoons': 'tsp',
  'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
  'cup': 'cups', 'cups': 'cups',
  'ounce': 'oz', 'ounces': 'oz',
  'pound': 'lb', 'pounds': 'lb',
}

const SECTION_MARKERS = [
  /^for the (.+)/i,
  /^(.+) sauce$/i,
  /^(.+) dressing$/i,
  /^(.+) marinade$/i,
  /^(.+) filling$/i,
  /^(.+) base$/i,
  /^(.+) topping$/i,
]

const METHOD_MARKERS = [
  /^method\b/i,
  /^instructions?\b/i,
  /^directions?\b/i,
  /^steps?\b/i,
  /^how to (make|cook|prepare)/i,
  /^preparation\b/i,
]

const INGREDIENT_MARKERS = [
  /^ingredients?\b/i,        // matches "Ingredients", "Ingredients Serves 4", etc.
  /^you('ll| will) need\b/i,
  /^what you need\b/i,
]

const NOISE_PATTERNS = [
  /^\s*$/,
  /^[A-Z][^.!?]*\b(story|tale|blog|share|pin|save|print|jump)\b/i,
  /^(published|updated|posted|by|written by|author)/i,
  /^(advertisement|advert|sponsored)/i,
  /^(serves?|portions?|yield):\s*[\d–-]+$/i,
  /^(prep|cook|total)\s*time/i,
  /^(calories|nutrition|kcal)/i,
  /^(subscribe|newsletter|email|sign up)/i,
  /^(comments?|leave a comment|reply|responses?)/i,
  /^(rating|stars?|reviews?)/i,
  /^(pin it|save recipe|print recipe|jump to recipe)/i,
  // Allrecipes-style serving info line: "Original recipe (1X) yields 2 servings"
  /^original recipe\b/i,
  // Serving-size scaler buttons (e.g. allrecipes "½x / 1x / 2x")
  // These survive fraction-normalisation as decimals like "0.5x", "1x", "2x"
  /^[\d\.]+x$/i,
  // Website unit-toggle UI labels — sometimes concatenated in the DOM
  /^US\s*Customary(Metric)?$/i,
  /^Metric$/i,
  // Source attributions and bare URLs — extracted separately before this filter runs
  /^source:/i,
  /^(www\.|https?:\/\/)/i,
]

// Ingredient line: optional quantity + optional unit + ingredient text
const INGREDIENT_PATTERN =
  /^([\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\-\.]+)?\s*(g|kg|ml|l|tsp|tbsp|cups?|teaspoons?|tablespoons?|grams?|kilograms?|millilitres?|litres?|oz|lb|pounds?|ounces?)?\s+(.+)/i

// ---- OCR garbage detection ----------------------------------
// Catches common Tesseract artefacts from rotated or low-quality images
function isOcrGarbage(line: string): boolean {
  // Pipe symbols never appear in recipe text
  if (/\|/.test(line)) return true
  // 1–3 all-uppercase chars with no lowercase (NY, LJ, TNS, etc.)
  if (/^[A-Z]{1,3}$/.test(line.trim())) return true
  // Lines that start with a closing bracket or parenthesis (OCR fragment)
  if (/^[)}\]]/.test(line.trim())) return true
  // Mostly non-alphanumeric
  const alphaNum = (line.match(/[a-zA-Z0-9]/g) ?? []).length
  if (line.length > 2 && alphaNum / line.length < 0.4) return true
  return false
}

// ---- Bullet / OCR-noise stripping ---------------------------
// Tesseract commonly misreads bullet characters (•) as:
// *, -, –, ¢, ©, °, and single letters like e, o, c
function stripBullet(line: string): string {
  // Genuine bullet/list characters
  const stripped = line.replace(/^[•·○◦▪▸►‣⁃⁎●▢☐☑☒◻◽]\s*/, '')
  if (stripped !== line) return stripped.trim()

  // Common OCR symbol misreads followed by whitespace
  const symStripped = line.replace(/^[*\-–—¢©®°~]\s+/, '')
  if (symStripped !== line) return symStripped.trim()

  // Single lowercase letter OCR'd as a bullet — only strip when what follows
  // looks like a quantity or capitalised word (not a real word like "e.g.")
  const letterStripped = line.replace(/^[eoc]\s+(?=[\d½¼¾⅓⅔⅛A-Z])/, '')
  if (letterStripped !== line) return letterStripped.trim()

  return line
}

// ---- Fraction normalisation ---------------------------------
// OCR sometimes returns Unicode fractions or splits them oddly
const UNICODE_FRACTION_MAP: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75,
  '⅓': 1/3, '⅔': 2/3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}
const UNICODE_FRACTION_RE = /[½¼¾⅓⅔⅛⅜⅝⅞]/g

function normaliseFractions(line: string): string {
  return line
    // Mixed numbers with digit + Unicode fraction FIRST: "1 ½" → "1.5", "2 ¾" → "2.75"
    // Must run before the bare Unicode replacements or "1 ½" becomes "1 0.5"
    .replace(new RegExp(`(\\d+)\\s+(${UNICODE_FRACTION_RE.source})`), (_, whole, frac) =>
      (Number(whole) + (UNICODE_FRACTION_MAP[frac] ?? 0)).toFixed(3).replace(/\.?0+$/, ''))
    // Mixed numbers with slash: "1 1/2" → "1.5", "2 3/4" → "2.75"
    .replace(/(\d+)\s+(\d+)\s*\/\s*(\d+)/g, (_, whole, num, denom) =>
      (Number(whole) + Number(num) / Number(denom)).toFixed(3).replace(/\.?0+$/, ''))
    // Bare Unicode fractions: "½" → "0.5"
    .replace(/½/g, '0.5')
    .replace(/¼/g, '0.25')
    .replace(/¾/g, '0.75')
    .replace(/⅓/g, '0.33')
    .replace(/⅔/g, '0.67')
    .replace(/⅛/g, '0.125')
    .replace(/⅜/g, '0.375')
    .replace(/⅝/g, '0.625')
    .replace(/⅞/g, '0.875')
    // Remaining simple fractions: "3/4" → "0.75"
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, num, denom) =>
      (Number(num) / Number(denom)).toFixed(3).replace(/\.?0+$/, ''))
}

// ============================================================
// Multi-recipe detection
// ============================================================
// Splits a block of text that contains multiple pasted recipes
// into individual chunks. Uses bare URL lines as natural
// separators — each recipe from a website ends with its URL.
// Falls back to title-detection splitting when no URLs are found.
// ============================================================

export function splitIntoRecipes(rawText: string): string[] {
  const lines = rawText.split(/\r?\n/)
  const chunks: string[] = []
  let current: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // A bare URL line signals the end of a recipe
    if (/^(www\.|https?:\/\/)/i.test(trimmed) && current.length > 0) {
      current.push(line)
      const chunk = current.join('\n').trim()
      if (chunk.length > 50) chunks.push(chunk)
      current = []
    } else {
      current.push(line)
    }
  }

  // Flush any remaining content
  const tail = current.join('\n').trim()
  if (tail.length > 50) chunks.push(tail)

  // If no URL-based splits were found, return the whole text as one recipe
  if (chunks.length === 0) return [rawText]

  // Filter out chunks that are too short to be a recipe
  return chunks.filter(c => c.trim().length > 100)
}

export function parseOcrText(rawText: string): ImportedRecipe {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  let title = ''
  let source = ''
  const sections: IngredientSectionInput[] = []
  const methodSteps: string[] = []

  type Phase = 'scanning' | 'ingredients' | 'method'
  let phase: Phase = 'scanning'
  let currentSection: IngredientSectionInput = {
    title: '',
    display_order: 0,
    ingredients: [],
  }
  let stepNumber = 0

  const pushCurrentSection = () => {
    if (currentSection.ingredients.length > 0) {
      sections.push({ ...currentSection })
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]

    // ---- Source extraction (before noise filter) ----------------
    // Capture source attribution so it populates the Source field
    if (!source) {
      const srcMatch = rawLine.match(/^source:\s*(.+)/i)
      if (srcMatch) { source = srcMatch[1].trim(); continue }
      if (/^(www\.|https?:\/\/)/i.test(rawLine.trim())) {
        source = rawLine.trim()
        continue
      }
    }

    // Strip OCR bullet noise, then normalise fractions
    const line = normaliseFractions(stripBullet(rawLine))

    // ---- Skip noise and OCR garbage ----------------------------
    if (NOISE_PATTERNS.some(p => p.test(line))) continue
    if (isOcrGarbage(line)) continue
    if (line.length < 2) continue

    // ---- Title detection (first substantial non-marker line) ---
    if (!title && line.length > 7 && line.length < 120 && phase === 'scanning') {
      const isServingsLine =
        /^(serves?|servings?|yield|portions?)/i.test(line) ||
        /^\d+\s*(servings?|portions?|people|guests?)/i.test(line) ||
        /^serving size/i.test(line)
      if (
        !isServingsLine &&
        /^[A-Z]/.test(line) &&
        !INGREDIENT_MARKERS.some(p => p.test(line)) &&
        !METHOD_MARKERS.some(p => p.test(line))
      ) {
        title = line
        continue
      }
    }

    // ---- Phase markers ------------------------------------
    if (INGREDIENT_MARKERS.some(p => p.test(line))) {
      phase = 'ingredients'
      pushCurrentSection()
      currentSection = { title: '', display_order: sections.length, ingredients: [] }
      continue
    }
    if (METHOD_MARKERS.some(p => p.test(line))) {
      phase = 'method'
      pushCurrentSection()
      currentSection = { title: '', display_order: sections.length, ingredients: [] }
      continue
    }

    // ---- Ingredient phase ------------------------------------
    if (phase === 'ingredients') {
      // Sub-section header? Explicit SECTION_MARKERS patterns OR any short standalone
      // line that can't be an ingredient — catches "Sauce", "Croutons", "For the base",
      // "Salsa", etc. that fall outside the narrow marker list.
      const matchesMarker = SECTION_MARKERS.some(p => p.test(line))
      const looksLikeHeader =
        line.length < 60 &&
        /^[A-Z]/.test(line) &&               // starts uppercase
        !/[\d]/.test(line.charAt(0)) &&      // doesn't start with a quantity digit
        !/[.!?]$/.test(line) &&              // not a sentence-ending line (method step)
        !looksLikeMethodStep(line) &&
        !INGREDIENT_PATTERN.test(line) &&
        currentSection.ingredients.length > 0  // only promote to header once we have some ingredients
      const isSectionHeader = matchesMarker || looksLikeHeader
      if (isSectionHeader && !INGREDIENT_PATTERN.test(line)) {
        pushCurrentSection()
        currentSection = { title: line, display_order: sections.length, ingredients: [] }
        continue
      }

      const ing = parseIngredientLine(line, currentSection.ingredients.length)
      if (ing) {
        currentSection.ingredients.push(ing)
        continue
      }

      // Unrecognised line — might be start of method
      if (looksLikeMethodStep(line)) {
        phase = 'method'
        pushCurrentSection()
      }
    }

    // ---- Method steps -------------------------------------
    if (phase === 'method') {
      if (stepNumber >= 10) continue

      const cleaned = line
        .replace(/^(step\s*)?\d+[\.\):\s]+/i, '')
        .trim()

      if (!cleaned) continue

      // Continuation: append if previous step ended mid-sentence OR this line
      // starts with a lowercase letter (OCR often splits long method sentences)
      if (stepNumber > 0) {
        const prevStep = methodSteps[stepNumber - 1]
        const prevEndsOpen = !/[.!?]$/.test(prevStep)
        const startsLower  = !/^[A-Z0-9]/.test(cleaned)
        if ((prevEndsOpen || startsLower) && cleaned.length < 120) {
          methodSteps[stepNumber - 1] += ' ' + cleaned
          continue
        }
      }

      const condensed = condenseParagraph(cleaned)
      if (condensed) {
        methodSteps.push(condensed)
        stepNumber++
      }
    }

    // ---- Fallback scanning phase -------------------------
    // Only auto-start ingredient collection when a quantity or unit is present.
    // Plain text lines (e.g. the recipe title) are too easily mis-parsed as
    // ingredients in this phase.
    if (phase === 'scanning') {
      const ing = parseIngredientLine(line, 0)
      if (ing && (ing.quantity || ing.unit)) {
        phase = 'ingredients'
        currentSection = { title: '', display_order: 0, ingredients: [ing] }
      } else if (looksLikeMethodStep(line) && title) {
        phase = 'method'
        const cleaned = line.replace(/^(step\s*)?\d+[\.\):\s]+/i, '').trim()
        const condensed = condenseParagraph(cleaned)
        if (condensed) {
          methodSteps.push(condensed)
          stepNumber++
        }
      }
    }
  }

  // Flush remaining section
  pushCurrentSection()

  // ---- Deduplicate ingredients in each section ----------------
  // Rotated or double-scanned images cause Tesseract to emit the same
  // lines twice. Keep the first occurrence of each ingredient name.
  for (const section of sections) {
    const seen = new Set<string>()
    section.ingredients = section.ingredients.filter(ing => {
      const key = ing.ingredient_name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Remove sections that are now empty after deduplication
  const filledSections = sections.filter(s => s.ingredients.length > 0)

  // ---- Deduplicate method steps ------------------------------
  const uniqueSteps = methodSteps.filter((step, i) => {
    const norm = step.toLowerCase().replace(/\s+/g, ' ').trim()
    return !methodSteps.slice(0, i).some(prev =>
      prev.toLowerCase().replace(/\s+/g, ' ').trim() === norm,
    )
  })

  // ---- Title recovery ----------------------------------------
  // Phone scan modes don't always output lines in strict top-to-bottom
  // order, and the image may be rotated so the title appears late in the
  // OCR stream. Search all raw lines and pick the best title candidate:
  // the longest line that looks like a recipe name (starts uppercase,
  // ≥2 words, no method verbs, not parseable as an ingredient).
  if (!title) {
    const rawLines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)

    let best = ''
    for (const raw of rawLines) {
      const candidate = normaliseFractions(stripBullet(raw))
      if (candidate.length < 10 || candidate.length > 80) continue
      if (NOISE_PATTERNS.some(p => p.test(candidate)))     continue
      if (INGREDIENT_MARKERS.some(p => p.test(candidate))) continue
      if (METHOD_MARKERS.some(p => p.test(candidate)))     continue
      if (/^(serves?|servings?|yield|portions?)/i.test(candidate)) continue
      if (isOcrGarbage(candidate)) continue
      if (looksLikeMethodStep(candidate)) continue
      if (!/^[A-Z]/.test(candidate)) continue
      if (candidate.split(/\s+/).length < 2) continue
      // Reject if it parses as an ingredient with a recognised unit
      const asIng = parseIngredientLine(candidate, 0)
      if (asIng?.unit) continue
      // Prefer longer candidates — titles tend to be more specific than fragments
      if (candidate.length > best.length) best = candidate
    }
    title = best
  }

  if (filledSections.length === 0) {
    filledSections.push({ title: '', display_order: 0, ingredients: [] })
  }

  return {
    title:        title || 'Untitled Recipe',
    source:       source || undefined,
    sections:     filledSections,
    method_steps: uniqueSteps,
    raw_text:     rawText,
  }
}

function parseIngredientLine(
  line: string,
  order: number
): RecipeIngredientInput | null {
  if (line.length < 2 || line.length > 200) return null

  // Skip lines that look like section headers or step numbers
  if (/^\d+\.?\s*$/.test(line)) return null

  // Skip OCR garbage fragments (bracket-prefixed quantities like "TNS) 20g")
  if (/^[A-Za-z]{1,4}\)/.test(line)) {
    // Strip the garbage prefix and retry with the remainder
    line = line.replace(/^[A-Za-z]+\)\s*/, '').trim()
    if (line.length < 2) return null
  }

  const match = line.match(INGREDIENT_PATTERN)
  if (!match) {
    // No recognised unit — could be "2 eggs" or just "Salt to taste"
    const simpleMatch = line.match(/^([\d\.]+)\s+(.+)/)
    if (simpleMatch) {
      return {
        ingredient_name: capitalise(simpleMatch[2].trim()),
        quantity:        simpleMatch[1],
        unit:            'number',
        preparation:     '',
        display_order:   order,
      }
    }
    // Plain ingredient, no quantity — accept if reasonably short
    if (line.split(' ').length <= 8 && !/[.!?]$/.test(line)) {
      return {
        ingredient_name: capitalise(line),
        quantity:        '',
        unit:            '',
        preparation:     '',
        display_order:   order,
      }
    }
    return null
  }

  const rawQty  = (match[1] ?? '').trim()
  const rawUnit = (match[2] ?? '').trim().toLowerCase()
  let rest      = (match[3] ?? '').trim()

  // Separate prep note (comma or bracket)
  let ingredientName = rest
  let preparation    = ''

  const commaIdx = rest.indexOf(',')
  if (commaIdx > 0) {
    ingredientName = rest.slice(0, commaIdx).trim()
    preparation    = rest.slice(commaIdx + 1).trim()
  }
  const bracketMatch = ingredientName.match(/^(.+?)\s*\((.+?)\)$/)
  if (bracketMatch) {
    ingredientName = bracketMatch[1].trim()
    preparation    = bracketMatch[2].trim() + (preparation ? ', ' + preparation : '')
  }

  const normalisedUnit = UNIT_ALIASES[rawUnit] ?? rawUnit

  // Convert imperial weight units to grams
  let finalQty  = rawQty
  let finalUnit = normalisedUnit
  if ((normalisedUnit === 'lb' || normalisedUnit === 'oz') && rawQty) {
    const parsed = parseFloat(rawQty)
    if (!isNaN(parsed)) {
      const grams = normalisedUnit === 'lb'
        ? Math.round(parsed * 453.592)
        : Math.round(parsed * 28.35)
      finalQty  = grams.toString()
      finalUnit = 'g'
    }
  }

  return {
    ingredient_name: capitalise(ingredientName),
    quantity:        finalQty,
    unit:            finalUnit,
    preparation,
    display_order:   order,
  }
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function looksLikeMethodStep(line: string): boolean {
  return (
    /^\d+[\.\):]/.test(line) ||
    /^step\s*\d+/i.test(line) ||
    (line.length > 40 && /\b(heat|add|mix|stir|bake|cook|preheat|combine|place|pour|transfer|season|bring|reduce|whisk|fold|serve|slice|chop|dice|fry|roast|grill|simmer|melt)\b/i.test(line))
  )
}

/** Return the method step text as-is — no truncation. */
function condenseParagraph(text: string): string {
  return text.trim()
}
