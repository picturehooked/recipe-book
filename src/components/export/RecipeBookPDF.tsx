import React from 'react'
import {
  Document, Page, Text, View, Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Recipe } from '@/types'

// ---- Palette -------------------------------------------------------
const C = {
  black:  '#000000',
  white:  '#ffffff',
  amber:  '#d97706',
  dark:   '#1a1a1a',
  mid:    '#555555',
  light:  '#999999',
  rule:   '#e8e4dd',
  noteBg: '#faf9f5',
}

// ---- Styles --------------------------------------------------------
const s = StyleSheet.create({
  // Cover
  coverPage: {
    backgroundColor: C.black,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  coverTitle: {
    fontFamily: 'Times-BoldItalic',
    fontSize: 58,
    color: C.white,
    textAlign: 'center',
    lineHeight: 1.25,
    letterSpacing: 1,
  },
  coverSubline: {
    fontFamily: 'Times-Italic',
    fontSize: 18,
    color: '#888888',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  // Shared content page
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.dark,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: C.light,
    fontFamily: 'Helvetica',
  },

  // Contents
  contentsTitleText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 26,
    color: C.dark,
    marginBottom: 20,
  },
  contentsCategory: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: C.amber,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 5,
  },
  contentsDots: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
    marginHorizontal: 6,
    marginBottom: 2,
  },
  contentsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  contentsRecipeTitle: {
    fontSize: 10,
    color: C.dark,
  },
  contentsPageNum: {
    fontSize: 9,
    color: C.light,
  },

  // Recipe page
  recipeTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: C.dark,
    marginBottom: 10,
    lineHeight: 1.2,
  },
  heroImage: {
    width: '100%',
    height: 190,
    objectFit: 'cover',
    borderRadius: 6,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 12,
  },
  metaText: {
    fontSize: 9,
    color: C.mid,
  },
  sectionHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: C.amber,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  ingredientGroupLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: C.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 7,
    marginBottom: 2,
  },
  ingredientRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ingredientBullet: {
    width: 10,
    fontSize: 11,
    color: C.amber,
    lineHeight: 1.1,
  },
  ingredientText: {
    flex: 1,
    fontSize: 9.5,
    color: C.dark,
    lineHeight: 1.45,
  },
  ingredientQty: {
    fontFamily: 'Helvetica-Bold',
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  stepNum: {
    width: 18,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: C.amber,
    marginTop: 1,
  },
  stepText: {
    flex: 1,
    fontSize: 9.5,
    color: C.dark,
    lineHeight: 1.5,
  },
  notesBox: {
    marginTop: 12,
    backgroundColor: C.noteBg,
    borderLeftWidth: 2,
    borderLeftColor: C.amber,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  notesLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: C.amber,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  notesText: {
    fontSize: 9,
    color: C.mid,
    lineHeight: 1.55,
  },
  sourceText: {
    marginTop: 8,
    fontSize: 8,
    color: C.light,
  },
})

// ---- Sub-components ------------------------------------------------

function PageFooter({ num }: { num: number }) {
  return <Text style={s.pageFooter} fixed>{num}</Text>
}

function CoverPage({ title }: { title: string }) {
  return (
    <Page size="A4" style={s.coverPage}>
      <Text style={s.coverTitle}>{title || 'My Recipe Book'}</Text>
      <Text style={s.coverSubline}>Recipe Collection</Text>
    </Page>
  )
}

interface ContentsEntry {
  title: string
  category: string
  pageNum: number
}

function ContentsPage({ entries }: { entries: ContentsEntry[] }) {
  // Group by category preserving insertion order
  const groups: { category: string; items: ContentsEntry[] }[] = []
  const seen = new Map<string, number>()
  entries.forEach((e) => {
    if (!seen.has(e.category)) {
      seen.set(e.category, groups.length)
      groups.push({ category: e.category, items: [] })
    }
    groups[seen.get(e.category)!].items.push(e)
  })

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.contentsTitleText}>Contents</Text>
      {groups.map((g) => (
        <View key={g.category}>
          <Text style={s.contentsCategory}>{g.category}</Text>
          {g.items.map((item) => (
            <View key={item.pageNum} style={s.contentsRow}>
              <Text style={s.contentsRecipeTitle}>{item.title}</Text>
              <View style={s.contentsDots} />
              <Text style={s.contentsPageNum}>{item.pageNum}</Text>
            </View>
          ))}
        </View>
      ))}
      <PageFooter num={1} />
    </Page>
  )
}

function RecipePage({ recipe, pageNum }: { recipe: Recipe; pageNum: number }) {
  const sections     = (recipe.ingredient_sections ?? []).slice().sort((a, b) => a.display_order - b.display_order)
  const ingredients  = (recipe.recipe_ingredients  ?? []).slice().sort((a, b) => a.display_order - b.display_order)
  const steps        = (recipe.method_steps        ?? []).slice().sort((a, b) => a.step_number   - b.step_number)

  const grouped =
    sections.length > 0
      ? sections.map((sec) => ({
          title: sec.title,
          items: ingredients.filter((i) => i.section_id === sec.id),
        }))
      : [{ title: null, items: ingredients }]

  return (
    <Page size="A4" style={s.page}>
      {/* Title */}
      <Text style={s.recipeTitle}>{recipe.title}</Text>

      {/* Hero image */}
      {recipe.hero_image_url && (
        <Image style={s.heroImage} src={recipe.hero_image_url} />
      )}

      {/* Serves */}
      {recipe.servings != null && (
        <View style={s.metaRow}>
          <Text style={s.metaText}>Serves {recipe.servings}</Text>
        </View>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <View>
          <Text style={s.sectionHeading}>Ingredients</Text>
          {grouped.map((group, gi) => (
            <View key={gi}>
              {group.title ? (
                <Text style={s.ingredientGroupLabel}>{group.title}</Text>
              ) : null}
              {group.items.map((ing) => {
                const qty  = ing.quantity !== null ? String(ing.quantity) : ''
                const unit = ing.unit && ing.unit !== 'number' ? ing.unit : ''
                const prep = ing.preparation ? `, ${ing.preparation}` : ''
                const qtyStr = [qty, unit].filter(Boolean).join(unit === 'g' || unit === 'ml' ? '' : ' ')
                return (
                  <View key={ing.id} style={s.ingredientRow}>
                    <Text style={s.ingredientBullet}>·</Text>
                    <Text style={s.ingredientText}>
                      {qtyStr ? (
                        <Text style={s.ingredientQty}>{qtyStr} </Text>
                      ) : null}
                      {ing.ingredient_name}{prep}
                    </Text>
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      )}

      {/* Method */}
      {steps.length > 0 && (
        <View>
          <Text style={s.sectionHeading}>Method</Text>
          {steps.map((step) => (
            <View key={step.id} style={s.stepRow}>
              <Text style={s.stepNum}>{step.step_number}.</Text>
              <Text style={s.stepText}>{step.instruction}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      {recipe.notes ? (
        <View style={s.notesBox}>
          <Text style={s.notesLabel}>Notes</Text>
          <Text style={s.notesText}>{recipe.notes}</Text>
        </View>
      ) : null}

      {/* Source */}
      {recipe.source ? (
        <Text style={s.sourceText}>Source: {recipe.source}</Text>
      ) : null}

      <PageFooter num={pageNum} />
    </Page>
  )
}

// ---- Main export ---------------------------------------------------

export interface RecipeBookPDFProps {
  title:   string
  recipes: Recipe[]
}

export function RecipeBookPDF({ title, recipes }: RecipeBookPDFProps) {
  const entries: ContentsEntry[] = recipes.map((r, i) => ({
    title:    r.title,
    category: r.category?.name ?? 'Uncategorised',
    pageNum:  i + 2,   // cover = unnumbered, contents = 1, recipes = 2+
  }))

  return (
    <Document title={title || 'Recipe Book'} author="Recipe App">
      <CoverPage title={title} />
      <ContentsPage entries={entries} />
      {recipes.map((recipe, i) => (
        <RecipePage key={recipe.id} recipe={recipe} pageNum={i + 2} />
      ))}
    </Document>
  )
}
