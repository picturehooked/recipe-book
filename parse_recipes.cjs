'use strict'

// ============================================================
// parse_recipes.cjs
// Multi-recipe splitter and structured parser — Node.js CJS module.
// Mirrors the logic in src/lib/utils/ocr-parser.ts.
//
// Exports:
//   splitIntoRecipes(rawText)  → string[]
//   parseOcrText(rawText)      → ImportedRecipe
//
// CLI usage:
//   node parse_recipes.cjs <file.txt>
//   Outputs JSON array of parsed recipes to stdout.
// ============================================================

// ---- Unit normalisation ------------------------------------
const UNIT_ALIASES = {
  'grams': 'g',       'gram': 'g',
  'kilograms': 'kg',  'kilogram': 'kg',
  'millilitres': 'ml','millilitre': 'ml','milliliters': 'ml','milliliter': 'ml',
  'litres': 'l',      'litre': 'l',     'liter': 'l',      'liters': 'l',
  'teaspoon': 'tsp',  'teaspoons': 'tsp',
  'tablespoon': 'tbsp','tablespoons': 'tbsp',
  'cup': 'cups',      'cups': 'cups',
  'ounce': 'oz',      'ounces': 'oz',
  'pound': 'lb',      'pounds': 'lb',
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
  /^ingredients?\b/i,
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
  /^original recipe\b/i,
  /^[\d\.]+x$/i,
  /^US\s*Customary(Metric)?$/i,
  /^Metric$/i,
  /^source:/i,
  /^(www\.|https?:\/\/)/i,
]

const INGREDIENT_PATTERN =
  /^([\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\-\.]+)?\s*(g|kg|ml|l|tsp|tbsp|cups?|teaspoons?|tablespoons?|grams?|kilograms?|millilitres?|litres?|oz|lb|pounds?|ounces?)?\s+(.+)/i

// ---- OCR garbage detection ---------------------------------
function isOcrGarbage(line) {
  if (/\|/.test(line)) return true
  if (/^[A-Z]{1,3}$/.test(line.trim())) return true
  if (/^[)}\]]/.test(line.trim())) return true
  const alphaNum = (line.match(/[a-zA-Z0-9]/g) ?? []).length
  if (line.length > 2 && alphaNum / line.length < 0.4) return true
  return false
}

// ---- Bullet stripping --------------------------------------
function stripBullet(line) {
  const stripped = line.replace(/^[•·○◦▪▸►‣⁃⁎●▢☐☑☒◻◽]\s*/, '')
  if (stripped !== line) return stripped.trim()
  const symStripped = line.replace(/^[*\-–—¢©®°~]\s+/, '')
  if (symStripped !== line) return symStripped.trim()
  const letterStripped = line.replace(/^[eoc]\s+(?=[\d½¼¾⅓⅔⅛A-Z])/, '')
  if (letterStripped !== line) return letterStripped.trim()
  return line
}

// ---- Fraction normalisation --------------------------------
const UNICODE_FRACTION_MAP = {
  '½': 0.5, '¼': 0.25, '¾': 0.75,
  '⅓': 1/3, '⅔': 2/3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
}

function normaliseFractions(line) {
  return line
    .replace(/(\d+)\s+([½¼¾⅓⅔⅛⅜⅝⅞])/g, (_, whole, frac) =>
      (Number(whole) + (UNICODE_FRACTION_MAP[frac] ?? 0)).toFixed(3).replace(/\.?0+$/, ''))
    .replace(/(\d+)\s+(\d+)\s*\/\s*(\d+)/g, (_, whole, num, denom) =>
      (Number(whole) + Number(num) / Number(denom)).toFixed(3).replace(/\.?0+$/, ''))
    .replace(/½/g, '0.5')
    .replace(/¼/g, '0.25')
    .replace(/¾/g, '0.75')
    .replace(/⅓/g, '0.33')
    .replace(/⅔/g, '0.67')
    .replace(/⅛/g, '0.125')
    .replace(/⅜/g, '0.375')
    .replace(/⅝/g, '0.625')
    .replace(/⅞/g, '0.875')
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, num, denom) =>
      (Number(num) / Number(denom)).toFixed(3).replace(/\.?0+$/, ''))
}

// ============================================================
// Multi-recipe boundary detection
//
// Rules (in priority order):
//   1. A line matching /^---+$/ is an explicit recipe separator.
//   2. A "Source:" label or bare URL/www line ends the current recipe
//      (the source line is included in the chunk before flushing).
//   3. After a method phase has been seen, an ingredient section
//      marker signals the start of the next recipe — the current
//      chunk is flushed and the ingredients line opens the new one.
// ============================================================

function splitIntoRecipes(rawText) {
  const lines = rawText.split(/\r?\n/)
  const chunks = []
  let current = []
  let seenMethod = false

  const flush = () => {
    const chunk = current.join('\n').trim()
    if (chunk.length > 50) chunks.push(chunk)
    current = []
    seenMethod = false
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Rule 1 — explicit --- separator
    if (/^---+$/.test(trimmed)) {
      flush()
      continue
    }

    // Rule 2 — source label or bare URL ends the current recipe
    const isSource =
      /^source:/i.test(trimmed) ||
      /^(www\.|https?:\/\/)/i.test(trimmed)
    if (isSource && current.length > 0) {
      current.push(line)   // include source line in this recipe's chunk
      flush()
      continue
    }

    // Track entry into method phase
    if (METHOD_MARKERS.some(p => p.test(trimmed))) {
      seenMethod = true
    }

    // Rule 3 — ingredients marker after a method = new recipe starts here
    if (seenMethod && INGREDIENT_MARKERS.some(p => p.test(trimmed)) && current.length > 0) {
      flush()
      // Fall through — this ingredients line belongs to the new recipe
    }

    current.push(line)
  }

  flush()

  if (chunks.length === 0) return [rawText]
  return chunks.filter(c => c.trim().length > 100)
}

// ---- Helpers -----------------------------------------------
function looksLikeMethodStep(line) {
  return (
    /^\d+[\.\):]/.test(line) ||
    /^step\s*\d+/i.test(line) ||
    (line.length > 40 && /\b(heat|add|mix|stir|bake|cook|preheat|combine|place|pour|transfer|season|bring|reduce|whisk|fold|serve|slice|chop|dice|fry|roast|grill|simmer|melt)\b/i.test(line))
  )
}

function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function parseIngredientLine(line, order) {
  if (line.length < 2 || line.length > 200) return null
  if (/^\d+\.?\s*$/.test(line)) return null
  if (/^[A-Za-z]{1,4}\)/.test(line)) {
    line = line.replace(/^[A-Za-z]+\)\s*/, '').trim()
    if (line.length < 2) return null
  }

  const match = line.match(INGREDIENT_PATTERN)
  if (!match) {
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

// ============================================================
// Single-recipe parser
// ============================================================

function parseOcrText(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  let title = ''
  let source = ''
  const sections = []
  const methodSteps = []

  let phase = 'scanning'
  let currentSection = { title: '', display_order: 0, ingredients: [] }
  let stepNumber = 0

  const pushCurrentSection = () => {
    if (currentSection.ingredients.length > 0) {
      sections.push({ ...currentSection, ingredients: [...currentSection.ingredients] })
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]

    // Source extraction (before noise filter)
    if (!source) {
      const srcMatch = rawLine.match(/^source:\s*(.+)/i)
      if (srcMatch) { source = srcMatch[1].trim(); continue }
      if (/^(www\.|https?:\/\/)/i.test(rawLine.trim())) {
        source = rawLine.trim()
        continue
      }
    }

    const line = normaliseFractions(stripBullet(rawLine))

    if (NOISE_PATTERNS.some(p => p.test(line))) continue
    if (isOcrGarbage(line)) continue
    if (line.length < 2) continue

    // Title detection
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

    // Phase markers
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

    // Ingredient phase
    if (phase === 'ingredients') {
      const matchesMarker = SECTION_MARKERS.some(p => p.test(line))
      const looksLikeHeader =
        line.length < 60 &&
        /^[A-Z]/.test(line) &&
        !/[\d]/.test(line.charAt(0)) &&
        !/[.!?]$/.test(line) &&
        !looksLikeMethodStep(line) &&
        !INGREDIENT_PATTERN.test(line) &&
        currentSection.ingredients.length > 0
      if ((matchesMarker || looksLikeHeader) && !INGREDIENT_PATTERN.test(line)) {
        pushCurrentSection()
        currentSection = { title: line, display_order: sections.length, ingredients: [] }
        continue
      }

      const ing = parseIngredientLine(line, currentSection.ingredients.length)
      if (ing) {
        currentSection.ingredients.push(ing)
        continue
      }

      if (looksLikeMethodStep(line)) {
        phase = 'method'
        pushCurrentSection()
      }
    }

    // Method phase
    if (phase === 'method') {
      if (stepNumber >= 10) continue

      const cleaned = line
        .replace(/^(step\s*)?\d+[\.\):\s]+/i, '')
        .trim()

      if (!cleaned) continue

      if (stepNumber > 0) {
        const prevStep = methodSteps[stepNumber - 1]
        const prevEndsOpen = !/[.!?]$/.test(prevStep)
        const startsLower  = !/^[A-Z0-9]/.test(cleaned)
        if ((prevEndsOpen || startsLower) && cleaned.length < 120) {
          methodSteps[stepNumber - 1] += ' ' + cleaned
          continue
        }
      }

      const condensed = cleaned.trim()
      if (condensed) {
        methodSteps.push(condensed)
        stepNumber++
      }
    }

    // Scanning fallback
    if (phase === 'scanning') {
      const ing = parseIngredientLine(line, 0)
      if (ing && (ing.quantity || ing.unit)) {
        phase = 'ingredients'
        currentSection = { title: '', display_order: 0, ingredients: [ing] }
      } else if (looksLikeMethodStep(line) && title) {
        phase = 'method'
        const cleaned = line.replace(/^(step\s*)?\d+[\.\):\s]+/i, '').trim()
        if (cleaned) {
          methodSteps.push(cleaned)
          stepNumber++
        }
      }
    }
  }

  pushCurrentSection()

  // Deduplicate ingredients
  for (const section of sections) {
    const seen = new Set()
    section.ingredients = section.ingredients.filter(ing => {
      const key = ing.ingredient_name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const filledSections = sections.filter(s => s.ingredients.length > 0)

  // Deduplicate method steps
  const uniqueSteps = methodSteps.filter((step, i) => {
    const norm = step.toLowerCase().replace(/\s+/g, ' ').trim()
    return !methodSteps.slice(0, i).some(prev =>
      prev.toLowerCase().replace(/\s+/g, ' ').trim() === norm,
    )
  })

  // Title recovery fallback
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
      const asIng = parseIngredientLine(candidate, 0)
      if (asIng && asIng.unit) continue
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

module.exports = { splitIntoRecipes, parseOcrText }

// ---- CLI entry point ----------------------------------------
if (require.main === module) {
  const fs   = require('fs')
  const path = require('path')

  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: node parse_recipes.cjs <file.txt>')
    process.exit(1)
  }

  const text = fs.readFileSync(path.resolve(filePath), 'utf8')
  const chunks = splitIntoRecipes(text)
  const parsed = chunks.map(c => parseOcrText(c))
  process.stdout.write(JSON.stringify(parsed, null, 2) + '\n')
}
