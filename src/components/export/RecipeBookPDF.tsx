import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { Recipe, RecipeIngredient } from '@/types'

export const CHALK_FONT_FAMILY = 'ChalkFont'

// ---- Palettes ------------------------------------------------------
const COVER_BLACK = '#000000'
const COVER_WHITE = '#ffffff'

const LIGHT = {
  bg:     '#faf9f5',
  text:   '#1a1a1a',
  mid:    '#555555',
  faint:  '#999999',
  rule:   '#e8e4dd',
  noteBg: '#f0ede6',
  accent: '#d97706',
}
const DARK = {
  bg:     '#0a0a0a',
  text:   '#f0ece6',
  mid:    '#a09890',
  faint:  '#606060',
  rule:   '#222222',
  noteBg: '#141414',
  accent: '#f59e0b',
}

// ---- Style factory -------------------------------------------------
function makeS(p: typeof LIGHT) {
  return StyleSheet.create({
    page: {
      paddingTop: 48, paddingBottom: 56, paddingHorizontal: 50,
      backgroundColor: p.bg,
      fontFamily: 'Helvetica',
      fontSize: 12,
      color: p.text,
    },
    // Page number footer — bold, uses main text colour (black/white, never grey)
    footer: {
      position: 'absolute',
      bottom: 24, left: 0, right: 0,
      textAlign: 'center', fontSize: 11,
      color: p.text,
      fontFamily: 'Helvetica-Bold',
    },
    // Contents
    contH1:        { fontFamily: 'Helvetica-Bold', fontSize: 28, color: p.text, marginBottom: 20 },
    contRow:       { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3 },
    contDots:      { flex: 1, borderBottomWidth: 0.5, borderBottomColor: p.rule, marginHorizontal: 6, marginBottom: 2 },
    // Section entries in contents (bold)
    contSecName:   { fontFamily: 'Helvetica-Bold', fontSize: 12, color: p.text },
    contSecPage:   { fontFamily: 'Helvetica-Bold', fontSize: 12, color: p.text },
    // Recipe entries in contents (normal, indented)
    contRecName:   { fontSize: 11, color: p.mid },
    contRecPage:   { fontSize: 11, color: p.mid },
    // Recipe page
    recipeTitle:   { fontFamily: 'Helvetica-Bold', fontSize: 24, color: p.text, marginBottom: 10, lineHeight: 1.2 },
    heroImage:     { width: '100%', height: 190, objectFit: 'cover', borderRadius: 6, marginBottom: 10 },
    metaText:      { fontSize: 11, color: p.mid, marginBottom: 10 },
    secLabel:      { fontFamily: 'Helvetica-Bold', fontSize: 10, color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 12, marginBottom: 5, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: p.rule },
    ingGroupLabel: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: p.mid, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 7, marginBottom: 2 },
    ingRow:        { flexDirection: 'row', marginBottom: 2 },
    ingBullet:     { width: 12, fontSize: 13, color: p.accent, lineHeight: 1.1 },
    ingText:       { flex: 1, fontSize: 11.5, color: p.text, lineHeight: 1.45 },
    ingQty:        { fontFamily: 'Helvetica-Bold' },
    stepRow:       { flexDirection: 'row', marginBottom: 5 },
    stepNum:       { width: 20, fontFamily: 'Helvetica-Bold', fontSize: 11, color: p.accent, marginTop: 1 },
    stepText:      { flex: 1, fontSize: 11.5, color: p.text, lineHeight: 1.5 },
    notesBox:      { marginTop: 12, backgroundColor: p.noteBg, borderLeftWidth: 2, borderLeftColor: p.accent, paddingVertical: 7, paddingHorizontal: 10 },
    notesLabel:    { fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: p.accent, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3 },
    notesText:     { fontSize: 11, color: p.mid, lineHeight: 1.55 },
    sourceText:    { marginTop: 8, fontSize: 10, color: p.faint },
  })
}

// ---- Cover / category page styles ----------------------------------
const cover = StyleSheet.create({
  page:    { backgroundColor: COVER_BLACK, padding: 60 },
  inner:   { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  title:   { fontFamily: CHALK_FONT_FAMILY, fontSize: 58, color: COVER_WHITE, textAlign: 'center', lineHeight: 1.3, marginBottom: 28 },
  image:   { width: '50%', height: 220, objectFit: 'cover', borderRadius: 6, alignSelf: 'center' },
  // Page number on section covers — bold white
  footer:  { position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 13, color: COVER_WHITE },
})

// ---- Helpers -------------------------------------------------------

function randomImage(recipes: Recipe[]): string | null {
  const imgs = recipes.filter(r => r.hero_image_url)
  return imgs.length > 0 ? imgs[Math.floor(Math.random() * imgs.length)].hero_image_url! : null
}

interface CatGroup {
  name:    string
  image:   string | null
  pageNum: number                            // page number for the category divider page
  recipes: { recipe: Recipe; pageNum: number }[]
}

interface ContentsSection {
  name:    string
  pageNum: number                            // page number of the category divider
  recipes: { title: string; pageNum: number }[]
}

/**
 * Groups recipes by category (DB sort_order), recipes A→Z within each.
 * Page numbering:
 *   cover          = unnumbered
 *   contents       = 1
 *   category pages = numbered (2, then after each recipe block, etc.)
 *   recipe pages   = numbered consecutively
 */
function buildGroups(recipes: Recipe[]): { groups: CatGroup[]; sections: ContentsSection[] } {
  const map = new Map<string, { name: string; sortOrder: number; recipes: Recipe[] }>()
  recipes.forEach(r => {
    const key = r.category?.id ?? '__uncat__'
    if (!map.has(key)) map.set(key, {
      name:      r.category?.name       ?? 'Uncategorised',
      sortOrder: r.category?.sort_order ?? 9999,
      recipes:   [],
    })
    map.get(key)!.recipes.push(r)
  })

  const sorted = Array.from(map.values())
    .sort((a, b) => a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.name.localeCompare(b.name))
    .map(g => ({ ...g, recipes: g.recipes.slice().sort((a, b) => a.title.localeCompare(b.title)) }))

  let pageNum = 2   // page 1 = contents; first category page = 2
  const sections: ContentsSection[] = []

  const groups: CatGroup[] = sorted.map(g => {
    const catPage = pageNum++
    const sectionRecipes: { title: string; pageNum: number }[] = []
    const groupRecipes = g.recipes.map(recipe => {
      const rp = pageNum++
      sectionRecipes.push({ title: recipe.title, pageNum: rp })
      return { recipe, pageNum: rp }
    })
    sections.push({ name: g.name, pageNum: catPage, recipes: sectionRecipes })
    return { name: g.name, image: randomImage(g.recipes), pageNum: catPage, recipes: groupRecipes }
  })

  return { groups, sections }
}

// ---- Ingredient item -----------------------------------------------

function IngRow({ ing, s }: { ing: RecipeIngredient; s: ReturnType<typeof makeS> }) {
  const qty    = ing.quantity !== null ? String(ing.quantity) : ''
  const unit   = ing.unit && ing.unit !== 'number' ? ing.unit : ''
  const prep   = ing.preparation ? `, ${ing.preparation}` : ''
  const qtyStr = [qty, unit].filter(Boolean).join(unit === 'g' || unit === 'ml' ? '' : ' ')
  return (
    <View style={s.ingRow}>
      <Text style={s.ingBullet}>·</Text>
      <Text style={s.ingText}>
        {qtyStr ? <Text style={s.ingQty}>{qtyStr} </Text> : null}
        {ing.ingredient_name}{prep}
      </Text>
    </View>
  )
}

// ---- Sub-components ------------------------------------------------

/** Black page: cover has no page number; category dividers pass their pageNum. */
function BlackPage({ title, imageUrl, pageNum }: { title: string; imageUrl: string | null; pageNum?: number }) {
  return (
    <Page size="A4" style={cover.page}>
      <View style={cover.inner}>
        <Text style={cover.title}>{title}</Text>
        {imageUrl && <Image style={cover.image} src={imageUrl} />}
      </View>
      {pageNum !== undefined && <Text style={cover.footer}>{pageNum}</Text>}
    </Page>
  )
}

function ContentsPage({ sections, s }: { sections: ContentsSection[]; s: ReturnType<typeof makeS> }) {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.contH1}>Contents</Text>
      {sections.map(sec => (
        <View key={sec.name} style={{ marginBottom: 10 }}>
          {/* Section header — bold name + bold page number */}
          <View style={s.contRow}>
            <Text style={s.contSecName}>{sec.name}</Text>
            <View style={s.contDots} />
            <Text style={s.contSecPage}>{sec.pageNum}</Text>
          </View>
          {/* Recipe entries — indented, lighter */}
          {sec.recipes.map(r => (
            <View key={r.pageNum} style={[s.contRow, { paddingLeft: 14 }]}>
              <Text style={s.contRecName}>{r.title}</Text>
              <View style={s.contDots} />
              <Text style={s.contRecPage}>{r.pageNum}</Text>
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

  // Two-column layout when > 12 ingredients and no named sections
  const useColumns = ingredients.length > 12 && sections.length === 0
  const half       = Math.ceil(ingredients.length / 2)

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
          {useColumns ? (
            /* Two-column layout for 12+ ingredients */
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                {ingredients.slice(0, half).map(ing => <IngRow key={ing.id} ing={ing} s={s} />)}
              </View>
              <View style={{ flex: 1, paddingLeft: 8 }}>
                {ingredients.slice(half).map(ing => <IngRow key={ing.id} ing={ing} s={s} />)}
              </View>
            </View>
          ) : (
            /* Single column — preserve section headers */
            grouped.map((group, gi) => (
              <View key={gi}>
                {group.title ? <Text style={s.ingGroupLabel}>{group.title}</Text> : null}
                {group.items.map(ing => <IngRow key={ing.id} ing={ing} s={s} />)}
              </View>
            ))
          )}
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

      {recipe.notes  && <View style={s.notesBox}><Text style={s.notesLabel}>Notes</Text><Text style={s.notesText}>{recipe.notes}</Text></View>}
      {recipe.source && <Text style={s.sourceText}>Source: {recipe.source}</Text>}

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
  const { groups, sections } = buildGroups(recipes)

  return (
    <Document title={title || 'Recipe Book'} author="Recipe App">
      {/* Main cover — no page number */}
      <BlackPage title={title || 'My Recipe Book'} imageUrl={coverImage} />
      {/* Contents — page 1 */}
      <ContentsPage sections={sections} s={s} />
      {/* Category pages (numbered) + recipe pages */}
      {groups.map(group => (
        <React.Fragment key={group.name}>
          <BlackPage title={group.name} imageUrl={group.image} pageNum={group.pageNum} />
          {group.recipes.map(({ recipe, pageNum }) => (
            <RecipePage key={recipe.id} recipe={recipe} pageNum={pageNum} s={s} />
          ))}
        </React.Fragment>
      ))}
    </Document>
  )
}
