import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { Recipe } from '@/types'

// Name used when the chalk font is registered externally before generation.
// Falls back to Times-BoldItalic if font loading fails.
export const CHALK_FONT_FAMILY = 'ChalkFont'

// ---- Palettes ------------------------------------------------------
const COVER_BLACK = '#000000'
const COVER_WHITE = '#ffffff'

const LIGHT = {
  bg:      '#faf9f5',
  text:    '#1a1a1a',
  mid:     '#555555',
  faint:   '#999999',
  rule:    '#e8e4dd',
  noteBg:  '#f0ede6',
  accent:  '#d97706',
}
const DARK = {
  bg:      '#16213e',
  text:    '#e8e4dd',
  mid:     '#b0a898',
  faint:   '#606060',
  rule:    '#2a3560',
  noteBg:  '#0f3460',
  accent:  '#f59e0b',
}

// ---- Style factory (content pages only) ----------------------------
function makeS(p: typeof LIGHT) {
  return StyleSheet.create({
    page: {
      paddingTop: 48, paddingBottom: 56, paddingHorizontal: 50,
      backgroundColor: p.bg,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: p.text,
    },
    footer: {
      position: 'absolute',
      bottom: 24, left: 0, right: 0,
      textAlign: 'center', fontSize: 9,
      color: p.faint, fontFamily: 'Helvetica',
    },
    // Contents
    contH1:    { fontFamily: 'Helvetica-Bold', fontSize: 26, color: p.text, marginBottom: 20 },
    contCat:   { fontFamily: 'Helvetica-Bold', fontSize: 9, color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 14, marginBottom: 5 },
    contRow:   { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
    contDots:  { flex: 1, borderBottomWidth: 0.5, borderBottomColor: p.rule, marginHorizontal: 6, marginBottom: 2 },
    contTitle: { fontSize: 10, color: p.text },
    contPage:  { fontSize: 9, color: p.faint },
    // Recipe
    recipeTitle:   { fontFamily: 'Helvetica-Bold', fontSize: 22, color: p.text, marginBottom: 10, lineHeight: 1.2 },
    heroImage:     { width: '100%', height: 190, objectFit: 'cover', borderRadius: 6, marginBottom: 10 },
    metaText:      { fontSize: 9, color: p.mid, marginBottom: 10 },
    secLabel:      { fontFamily: 'Helvetica-Bold', fontSize: 8, color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 12, marginBottom: 5, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: p.rule },
    ingGroupLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: p.mid, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 7, marginBottom: 2 },
    ingRow:        { flexDirection: 'row', marginBottom: 2 },
    ingBullet:     { width: 10, fontSize: 11, color: p.accent, lineHeight: 1.1 },
    ingText:       { flex: 1, fontSize: 9.5, color: p.text, lineHeight: 1.45 },
    ingQty:        { fontFamily: 'Helvetica-Bold' },
    stepRow:       { flexDirection: 'row', marginBottom: 5 },
    stepNum:       { width: 18, fontFamily: 'Helvetica-Bold', fontSize: 9, color: p.accent, marginTop: 1 },
    stepText:      { flex: 1, fontSize: 9.5, color: p.text, lineHeight: 1.5 },
    notesBox:      { marginTop: 12, backgroundColor: p.noteBg, borderLeftWidth: 2, borderLeftColor: p.accent, paddingVertical: 7, paddingHorizontal: 10 },
    notesLabel:    { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: p.accent, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3 },
    notesText:     { fontSize: 9, color: p.mid, lineHeight: 1.55 },
    sourceText:    { marginTop: 8, fontSize: 8, color: p.faint },
  })
}

// Fixed styles shared across cover/category pages (always black)
const cover = StyleSheet.create({
  page: {
    backgroundColor: COVER_BLACK,
    padding: 0,
  },
  bgImage: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    opacity: 0.28,
    objectFit: 'cover',
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
  },
  title: {
    fontFamily: CHALK_FONT_FAMILY,
    fontSize: 56,
    color: COVER_WHITE,
    textAlign: 'center',
    lineHeight: 1.3,
  },
})

// ---- Helpers -------------------------------------------------------

function pickRandom<T>(arr: T[]): T | null {
  return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null
}

function randomImage(recipes: Recipe[]): string | null {
  return pickRandom(recipes.filter(r => r.hero_image_url))?.hero_image_url ?? null
}

interface CatGroup {
  name:    string
  image:   string | null
  recipes: { recipe: Recipe; pageNum: number }[]
}

/** Sort categories A→Z, recipes within each category A→Z, assign page numbers. */
function buildGroups(recipes: Recipe[]): { groups: CatGroup[]; entries: ContentsEntry[] } {
  // Group
  const map = new Map<string, { name: string; sortOrder: number; recipes: Recipe[] }>()
  recipes.forEach(r => {
    const key  = r.category?.id ?? '__uncat__'
    const name = r.category?.name ?? 'Uncategorised'
    const so   = r.category?.sort_order ?? 9999
    if (!map.has(key)) map.set(key, { name, sortOrder: so, recipes: [] })
    map.get(key)!.recipes.push(r)
  })

  // Sort categories A→Z, then recipes within each A→Z
  const sorted = Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(g => ({
      name:    g.name,
      recipes: g.recipes.slice().sort((a, b) => a.title.localeCompare(b.title)),
    }))

  // Assign page numbers: cover = unnumbered, contents = 1, category pages = unnumbered, recipes = 2+
  let pageNum = 2
  const entries: ContentsEntry[] = []
  const groups: CatGroup[] = sorted.map(g => ({
    name:    g.name,
    image:   randomImage(g.recipes),
    recipes: g.recipes.map(recipe => {
      entries.push({ title: recipe.title, category: g.name, pageNum })
      return { recipe, pageNum: pageNum++ }
    }),
  }))

  return { groups, entries }
}

// ---- Sub-components ------------------------------------------------

/** Black page used for both cover and category dividers. */
function BlackPage({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  return (
    <Page size="A4" style={cover.page}>
      {imageUrl && <Image style={cover.bgImage} src={imageUrl} />}
      <View style={cover.content}>
        <Text style={cover.title}>{title}</Text>
      </View>
    </Page>
  )
}

interface ContentsEntry { title: string; category: string; pageNum: number }

function ContentsPage({ entries, s }: { entries: ContentsEntry[]; s: ReturnType<typeof makeS> }) {
  // Preserve category order from entries (already alphabetical)
  const groups: { cat: string; items: ContentsEntry[] }[] = []
  const seen = new Map<string, number>()
  entries.forEach(e => {
    if (!seen.has(e.category)) { seen.set(e.category, groups.length); groups.push({ cat: e.category, items: [] }) }
    groups[seen.get(e.category)!].items.push(e)
  })

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.contH1}>Contents</Text>
      {groups.map(g => (
        <View key={g.cat}>
          <Text style={s.contCat}>{g.cat}</Text>
          {g.items.map(item => (
            <View key={item.pageNum} style={s.contRow}>
              <Text style={s.contTitle}>{item.title}</Text>
              <View style={s.contDots} />
              <Text style={s.contPage}>{item.pageNum}</Text>
            </View>
          ))}
        </View>
      ))}
      <Text style={s.footer} fixed>1</Text>
    </Page>
  )
}

function RecipePage({ recipe, pageNum, s }: { recipe: Recipe; pageNum: number; s: ReturnType<typeof makeS> }) {
  const sections    = (recipe.ingredient_sections ?? []).slice().sort((a, b) => a.display_order - b.display_order)
  const ingredients = (recipe.recipe_ingredients  ?? []).slice().sort((a, b) => a.display_order - b.display_order)
  const steps       = (recipe.method_steps        ?? []).slice().sort((a, b) => a.step_number   - b.step_number)

  const grouped = sections.length > 0
    ? sections.map(sec => ({ title: sec.title, items: ingredients.filter(i => i.section_id === sec.id) }))
    : [{ title: null, items: ingredients }]

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.recipeTitle}>{recipe.title}</Text>

      {recipe.hero_image_url && <Image style={s.heroImage} src={recipe.hero_image_url} />}

      {recipe.servings != null && <Text style={s.metaText}>Serves {recipe.servings}</Text>}

      {ingredients.length > 0 && (
        <View>
          <Text style={s.secLabel}>Ingredients</Text>
          {grouped.map((group, gi) => (
            <View key={gi}>
              {group.title ? <Text style={s.ingGroupLabel}>{group.title}</Text> : null}
              {group.items.map(ing => {
                const qty    = ing.quantity !== null ? String(ing.quantity) : ''
                const unit   = ing.unit && ing.unit !== 'number' ? ing.unit : ''
                const prep   = ing.preparation ? `, ${ing.preparation}` : ''
                const qtyStr = [qty, unit].filter(Boolean).join(unit === 'g' || unit === 'ml' ? '' : ' ')
                return (
                  <View key={ing.id} style={s.ingRow}>
                    <Text style={s.ingBullet}>·</Text>
                    <Text style={s.ingText}>
                      {qtyStr ? <Text style={s.ingQty}>{qtyStr} </Text> : null}
                      {ing.ingredient_name}{prep}
                    </Text>
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      )}

      {steps.length > 0 && (
        <View>
          <Text style={s.secLabel}>Method</Text>
          {steps.map(step => (
            <View key={step.id} style={s.stepRow}>
              <Text style={s.stepNum}>{step.step_number}.</Text>
              <Text style={s.stepText}>{step.instruction}</Text>
            </View>
          ))}
        </View>
      )}

      {recipe.notes   && <View style={s.notesBox}><Text style={s.notesLabel}>Notes</Text><Text style={s.notesText}>{recipe.notes}</Text></View>}
      {recipe.source  && <Text style={s.sourceText}>Source: {recipe.source}</Text>}

      <Text style={s.footer} fixed>{pageNum}</Text>
    </Page>
  )
}

// ---- Main export ---------------------------------------------------

export interface RecipeBookPDFProps {
  title:    string
  recipes:  Recipe[]
  darkMode: boolean
}

export function RecipeBookPDF({ title, recipes, darkMode }: RecipeBookPDFProps) {
  const s                    = makeS(darkMode ? DARK : LIGHT)
  const coverImage           = randomImage(recipes)
  const { groups, entries }  = buildGroups(recipes)

  return (
    <Document title={title || 'Recipe Book'} author="Recipe App">
      {/* Cover — black, chalk title, faint bg image */}
      <BlackPage title={title || 'My Recipe Book'} imageUrl={coverImage} />

      {/* Contents */}
      <ContentsPage entries={entries} s={s} />

      {/* Category divider + recipe pages */}
      {groups.map(group => (
        <React.Fragment key={group.name}>
          <BlackPage title={group.name} imageUrl={group.image} />
          {group.recipes.map(({ recipe, pageNum }) => (
            <RecipePage key={recipe.id} recipe={recipe} pageNum={pageNum} s={s} />
          ))}
        </React.Fragment>
      ))}
    </Document>
  )
}
