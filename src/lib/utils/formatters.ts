// ============================================================
// Display formatting utilities
// ============================================================

/** Format minutes as "1h 30m" or "45 min" */
export function formatTime(minutes: number | null | undefined): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Format a total time label from prep + cook */
export function formatTotalTime(
  prepMins: number | null | undefined,
  cookMins: number | null | undefined
): string {
  const total = (prepMins ?? 0) + (cookMins ?? 0)
  return total > 0 ? formatTime(total) : ''
}

/** Create a URL-safe slug from a string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Relative date: "Today", "Yesterday", "3 days ago", or formatted date */
export function relativeDate(iso: string): string {
  const date  = new Date(iso)
  const now   = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return `${diffDays} days ago`

  return date.toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/** Truncate text to n characters with ellipsis */
export function truncate(text: string, n: number): string {
  return text.length > n ? `${text.slice(0, n).trimEnd()}…` : text
}

/** Capitalise first letter of a string */
export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Format servings for display */
export function formatServings(n: number | null): string {
  if (!n) return ''
  return `Serves ${n}`
}

/** Parse a fraction or decimal string to a number */
export function parseQuantity(s: string): number | null {
  if (!s.trim()) return null

  // Handle fractions: ½ ¾ ¼ ⅓ ⅔
  const fractionMap: Record<string, number> = {
    '½': 0.5, '¼': 0.25, '¾': 0.75,
    '⅓': 0.333, '⅔': 0.667,
    '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
  }
  for (const [char, val] of Object.entries(fractionMap)) {
    if (s.includes(char)) {
      const prefix = s.replace(char, '').trim()
      const prefixNum = prefix ? parseFloat(prefix) : 0
      return prefixNum + val
    }
  }

  // Handle "1/2" style
  const slashMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (slashMatch) return parseInt(slashMatch[1]) / parseInt(slashMatch[2])

  const n = parseFloat(s)
  return isNaN(n) ? null : n
}
