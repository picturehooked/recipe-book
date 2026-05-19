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
]

// Ingredient line: optional quantity + optional unit + ingredient text
const INGREDIENT_PATTERN =
  /^([\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\-\.]+)?\s*(g|kg|ml|l|tsp|tbsp|cups?|teaspoons?|tablespoons?|grams?|kilograms?|millilitres?|litres?|oz|lb|pounds?|ounces?)?\s+(.+)/i

// ---- Bullet / OCR-noise stripping ---------------------------
// Tesseract commonly misreads bullet characters (•) as:
// *, -, –, ¢, ©, °, and single letters like e, o, c
function stripBullet(line: string): string {
  // Genuine bullet/list characters
  const stripped = line.replace(/^[•·○◦▪▸►‣⁃⁎●]\s*/, '')
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
function normaliseFractions(line: string): string {
  return line
    .replace(/½/g, '0.5')
    .replace(/¼/g, '0.25')
    .replace(/¾/g, '0.75')
    .replace(/⅓/g, '0.33')
    .replace(/⅔/g, '0.67')
    .replace(/⅛/g, '0.125')
    .replace(/1\s*\/\s*2/g, '0.5')
    .replace(/1\s*\/\s*4/g, '0.25')
    .replace(/3\s*\/\s*4/g, '0.75')
}

export function parseOcrText(rawText: string): ImportedRecipe {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  let title = ''
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

    // Strip OCR bullet noise, then normalise fractions
    const line = normaliseFractions(stripBullet(rawLine))

    // ---- Skip noise ----------------------------------------
    if (NOISE_PATTERNS.some(p => p.test(line))) continue
    if (line.length < 2) continue

    // ---- Title detection (first substantial non-marker line) ---
    if (!title && line.length > 3 && line.length < 120 && phase === 'scanning') {
      // Don't use the line as title if it looks like an ingredient marker
      if (!INGREDIENT_MARKERS.some(p => p.test(line)) && !METHOD_MARKERS.some(p => p.test(line))) {
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
      // Sub-section header?
      const isSectionHeader = SECTION_MARKERS.some(p => p.test(line))
      if (isSectionHeader && line.length < 60 && !INGREDIENT_PATTERN.test(line)) {
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

      // Short continuation — append to previous step
      if (cleaned.length < 40 && stepNumber > 0 && !cleaned.match(/^[A-Z]/)) {
        methodSteps[stepNumber - 1] += ' ' + cleaned
        continue
      }

      const condensed = condenseParagraph(cleaned)
      if (condensed) {
        methodSteps.push(condensed)
        stepNumber++
      }
    }

    // ---- Fallback scanning phase -------------------------
    if (phase === 'scanning') {
      const ing = parseIngredientLine(line, 0)
      if (ing) {
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

  // Ensure at least one empty section so the form renders
  if (sections.length === 0) {
    sections.push({ title: '', display_order: 0, ingredients: [] })
  }

  return {
    title: title || 'Untitled Recipe',
    sections,
    method_steps: methodSteps,
    raw_text: rawText,
  }
}

function parseIngredientLine(
  line: string,
  order: number
): RecipeIngredientInput | null {
  if (line.length < 2 || line.length > 200) return null

  // Skip lines that look like section headers or step numbers
  if (/^\d+\.?\s*$/.test(line)) return null

  const match = line.match(INGREDIENT_PATTERN)
  if (!match) {
    // No recognised unit — could be "2 eggs" or just "Salt to taste"
    const simpleMatch = line.match(/^([\d\.]+)\s+(.+)/)
    if (simpleMatch) {
      return {
        ingredient_name: simpleMatch[2].trim(),
        quantity:        simpleMatch[1],
        unit:            'number',
        preparation:     '',
        display_order:   order,
      }
    }
    // Plain ingredient, no quantity — accept if reasonably short
    if (line.split(' ').length <= 8 && !/[.!?]$/.test(line)) {
      return {
        ingredient_name: line,
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

  return {
    ingredient_name: ingredientName,
    quantity:        rawQty,
    unit:            normalisedUnit,
    preparation,
    display_order:   order,
  }
}

function looksLikeMethodStep(line: string): boolean {
  return (
    /^\d+[\.\):]/.test(line) ||
    /^step\s*\d+/i.test(line) ||
    (line.length > 40 && /\b(heat|add|mix|stir|bake|cook|preheat|combine|place|pour|transfer|season|bring|reduce|whisk|fold|serve|slice|chop|dice|fry|roast|grill|simmer|melt)\b/i.test(line))
  )
}

/** Keep first 2 sentences of a paragraph, max ~240 chars */
function condenseParagraph(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  const kept = sentences.slice(0, 2).join(' ').trim()
  return kept.length > 240 ? kept.slice(0, 237).trimEnd() + '…' : kept
}
