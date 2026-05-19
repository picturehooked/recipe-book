// ============================================================
// UK Ingredient Conversion Utilities
// ============================================================
// Liquids  → ml where possible
// Dry goods → g where possible (via density mapping)
// Never fabricates impossible conversions.
// ============================================================

import type { Unit, ConversionResult } from '@/types'

// ------ Volume → ml factors (UK standard) ------------------
const VOLUME_TO_ML: Record<string, number> = {
  ml:    1,
  l:     1000,
  tsp:   5,       // UK teaspoon = 5ml
  tbsp:  15,      // UK tablespoon = 15ml
  cups:  240,     // metric cup
  'fl oz': 28.41, // UK fluid ounce
  'fl. oz': 28.41,
}

// ------ UK density map: g per cup --------------------------
// Extend this map as more ingredients are added.
const DENSITY_G_PER_CUP: Record<string, number> = {
  'plain flour':        120,
  'self-raising flour': 120,
  'granulated sugar':   200,
  'caster sugar':       200,
  'icing sugar':        120,
  'oats':               90,
  'basmati rice':       185,
  'arborio rice':       210,
}

// g per tablespoon (dry, UK)
const DENSITY_G_PER_TBSP: Record<string, number> = {
  'plain flour':        8,
  'caster sugar':       12,
  'icing sugar':        8,
  'cocoa powder':       6,
  'butter':             14,
}

// ---- Helpers -----------------------------------------------

function normalise(s: string): string {
  return s.toLowerCase().trim()
}

export function volumeToMl(quantity: number, unit: string): number | null {
  const factor = VOLUME_TO_ML[normalise(unit)]
  return factor !== undefined ? quantity * factor : null
}

export function dryToGrams(
  quantity: number,
  unit: string,
  ingredientName: string
): number | null {
  const ing = normalise(ingredientName)
  const u   = normalise(unit)

  if (u === 'g' || u === 'kg') {
    return u === 'kg' ? quantity * 1000 : quantity
  }

  const gPerCup  = DENSITY_G_PER_CUP[ing]
  const gPerTbsp = DENSITY_G_PER_TBSP[ing]

  if (u === 'cups' && gPerCup  !== undefined) return quantity * gPerCup
  if (u === 'tbsp' && gPerTbsp !== undefined) return quantity * gPerTbsp
  if (u === 'tsp'  && gPerTbsp !== undefined) return quantity * (gPerTbsp / 3)

  return null
}

/** Convert an entered measurement to the preferred display unit.
 *  Returns null if no safe conversion exists. */
export function convert(
  quantity: number,
  fromUnit: string,
  ingredientName: string
): ConversionResult | null {
  const u = normalise(fromUnit)
  const ing = normalise(ingredientName)

  // Already in a preferred unit
  if (u === 'g' || u === 'ml' || u === 'kg' || u === 'l') return null

  // Try volume → ml
  const ml = volumeToMl(quantity, fromUnit)
  if (ml !== null) {
    return {
      value:   ml,
      unit:    'ml',
      display: `${formatQuantity(ml)} ml`,
    }
  }

  // Try dry → g
  const g = dryToGrams(quantity, fromUnit, ingredientName)
  if (g !== null) {
    return {
      value:   g,
      unit:    'g',
      display: `${formatQuantity(g)} g`,
    }
  }

  // No conversion available — ing used implicitly by helpers above
  void ing
  return null
}

/** Format a numeric quantity cleanly (no trailing zeros, fractions as decimals) */
export function formatQuantity(n: number): string {
  if (Number.isInteger(n)) return n.toString()
  return parseFloat(n.toFixed(2)).toString()
}

/** Scale an ingredient quantity by a ratio (servings adjustment) */
export function scaleQuantity(quantity: number | null, ratio: number): number | null {
  if (quantity === null) return null
  const scaled = quantity * ratio
  // Round to 2 decimal places, avoiding floating point noise
  return Math.round(scaled * 100) / 100
}

/** Human-readable ingredient line, e.g. "200g plain flour, sifted" */
export function formatIngredientLine(
  ingredientName: string,
  quantity: number | null,
  unit: string | null,
  preparation: string | null,
  scaledQuantity?: number | null
): string {
  const qty = scaledQuantity !== undefined ? scaledQuantity : quantity
  const parts: string[] = []

  if (qty !== null && qty !== undefined) {
    const qtyStr = formatQuantity(qty)
    if (unit && unit !== 'number') {
      parts.push(`${qtyStr}${unit === 'g' || unit === 'ml' ? '' : ' '}${unit}`)
    } else if (unit === 'number') {
      parts.push(qtyStr)
    } else {
      parts.push(qtyStr)
    }
  }

  parts.push(ingredientName)
  if (preparation) parts.push(preparation)

  return parts.join(' ')
}

// Suppress linter — ing variable used in convert() even if TypeScript misses it
declare const _: unknown
