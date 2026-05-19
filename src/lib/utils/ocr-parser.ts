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
  'kilograms': 'kg', 'kilogram': 'kg', 'kg': 'kg',
  'millilitres': 'ml', 'millilitre': 'ml', 'milliliters': 'ml',
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
  /^method$/i,
  /^instructions?$/i,
  /^directions?$/i,
  /^steps?$/i,
  /^how to (make|cook|prepare)/i,
  /^preparation$/i,
]

const INGREDIENT_MARKERS = [
  /^ingredients?$/i,
  /^you('ll| will) need$/i,
  /^what you need$/i,
]

const NOISE_PATTERNS = [
  /^\s*$/,                          // blank
  /^[A-Z][^.!?]*\b(story|tale|blog|share|pin|save|print|jump)\b/i,
  /^(published|updated|posted|by|written by|author)/i,
  /^(advertisement|advert|sponsored)/i,
  /^(serves?|portions?|yield):\s*[\d–-]+/i,   // captured separately
  /^(prep|cook|total)\s*time/i,               // captured separately
  /^(calories|nutrition|kcal)/i,
  /^(subscribe|newsletter|email|sign up)/i,
  /^(comments?|leave a comment|reply|responses?)/i,
  /^(rating|stars?|reviews?)/i,
  /^(pin it|save recipe|print recipe|jump to recipe)/i,
]

// Ingredient line pattern: optional quantity + optional unit + ingredient text
const INGREDIENT_PATTERN =
  /^([\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\-\.]+)?\s*(g|kg|ml|l|tsp|tbsp|cups?|teaspoons?|tablespoons?|grams?|kilograms?|millilitres?|litres?|oz|lb|pounds?|ounces?)?\s+(.+)/i

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
  let methodBuffer = ''

  const pushCurrentSection = () => {
    if (currentSection.ingredients.length > 0) {
      sections.push({ ...currentSection })
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // ---- Skip noise ----------------------------------------
    if (NOISE_PATTERNS.some(p => p.test(line))) continue

    // ---- Title detection (first substantial non-marker line) ----
    if (!title && line.length > 3 && line.length < 120 && phase === 'scanning') {
      title = line
      continue
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

    // ---- Section sub-headers within ingredients -----------
    if (phase === 'ingredients') {
      const isSectionHeader = SECTION_MARKERS.some(p => p.test(line))
      if (isSectionHeader && line.length < 60 && !INGREDIENT_PATTERN.test(line)) {
        pushCurrentSection()
        currentSection = {
          title: line,
          display_order: sections.length,
          ingredients: [],
        }
        continue
      }

      const ing = parseIngredientLine(line, currentSection.ingredients.length)
      if (ing) {
        currentSection.ingredients.push(ing)
        continue
      }

      // Unrecognised line in ingredient phase — try treating as method start
      if (looksLikeMethodStep(line)) {
        phase = 'method'
        pushCurrentSection()
      }
    }

    // ---- Method steps -------------------------------------
    if (phase === 'method') {
      if (stepNumber >= 10) continue  // max 10 steps

      // Strip numbered prefixes: "1." "Step 1:" "1)" etc.
      const cleaned = line
        .replace(/^(step\s*)?\d+[\.\):\s]+/i, '')
        .trim()

      if (!cleaned) continue

      // Accumulate short continuations into previous step
      if (cleaned.length < 40 && stepNumber > 0 && !cleaned.match(/^[A-Z]/)) {
        methodSteps[stepNumber - 1] += ' ' + cleaned
        continue
      }

      // Condense long paragraphs to ~2 lines: keep first 2 sentences
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
  // Too short or too long to be an ingredient
  if (line.length < 2 || line.length > 150) return null

  const match = line.match(INGREDIENT_PATTERN)
  if (!match) {
    // No unit found — could still be "2 eggs" or "Salt to taste"
    const simpleMatch = line.match(/^([\d½¼¾⅓⅔⅛]+\.?\d*)\s+(.+)/)
    if (simpleMatch) {
      return {
        ingredient_name: simpleMatch[2].trim(),
        quantity: parseQuantity(simpleMatch[1])?.toString() ?? '',
        unit: 'number',
        preparation: '',
        display_order: order,
      }
    }
    // Treat as plain ingredient with no quantity
    if (line.split(' ').length <= 6) {
      return {
        ingredient_name: line,
        quantity: '',
        unit: '',
        preparation: '',
        display_order: order,
      }
    }
    return null
  }

  const rawQty  = (match[1] ?? '').trim()
  const rawUnit = (match[2] ?? '').trim().toLowerCase()
  const rest    = (match[3] ?? '').trim()

  // Separate ingredient name from preparation note (comma-separated or bracketed)
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
    unit:            normalisedUnit as string,
    preparation,
    display_order:   order,
  }
}

function looksLikeMethodStep(line: string): boolean {
  return (
    /^\d+[\.\):]/.test(line) ||
    /^step\s*\d+/i.test(line) ||
    (line.length > 40 && /\b(heat|add|mix|stir|bake|cook|preheat|combine|place|pour|transfer|season|bring|reduce|whisk|fold|serve|slice|chop|dice|fry|roast|grill|simmer)\b/i.test(line))
  )
}

/** Keep first 2 sentences of a paragraph, max ~200 chars */
function condenseParagraph(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  const kept = sentences.slice(0, 2).join(' ').trim()
  return kept.length > 240 ? kept.slice(0, 237).trimEnd() + '…' : kept
}
