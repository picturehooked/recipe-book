import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Recipe } from '@/types'

// ---- Styles --------------------------------------------------------
const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 80,
    paddingTop: 70,
    paddingBottom: 70,
  },
  // Outer container — fills remaining height and distributes children evenly
  inner: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  // Title
  title: {
    fontFamily: 'Times-BoldItalic',
    fontSize: 46,
    color: '#111111',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  // Thin ornamental rule under the title
  rule: {
    width: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    marginTop: 0,
    alignSelf: 'center',
  },
  // Category block (heading + recipe names grouped together)
  catBlock: {
    alignItems: 'center',
  },
  catName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#111111',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 3.5,
    marginBottom: 5,
  },
  recipeName: {
    fontFamily: 'Times-Roman',
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 1.6,
  },
})

// ---- Helpers -------------------------------------------------------

function buildMenuGroups(recipes: Recipe[]): { name: string; recipes: Recipe[] }[] {
  const map = new Map<string, { name: string; recipes: Recipe[] }>()
  recipes.forEach(r => {
    const key  = r.category?.id ?? '__uncat__'
    const name = r.category?.name ?? 'Uncategorised'
    if (!map.has(key)) map.set(key, { name, recipes: [] })
    map.get(key)!.recipes.push(r)
  })
  return Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(g => ({ ...g, recipes: g.recipes.slice().sort((a, b) => a.title.localeCompare(b.title)) }))
}

// ---- Component -----------------------------------------------------

export interface MenuPDFProps {
  title:   string
  recipes: Recipe[]
}

export function MenuPDF({ title, recipes }: MenuPDFProps) {
  const displayTitle = title.trim() || 'Menu'
  const groups       = buildMenuGroups(recipes)

  return (
    <Document title={displayTitle}>
      <Page size="A4" style={s.page}>
        <View style={s.inner}>
          {/* Header */}
          <View style={{ alignItems: 'center' }}>
            <Text style={s.title}>{displayTitle}</Text>
            <View style={s.rule} />
          </View>

          {/* Categories */}
          {groups.map(group => (
            <View key={group.name} style={s.catBlock}>
              <Text style={s.catName}>{group.name}</Text>
              {group.recipes.map(r => (
                <Text key={r.id} style={s.recipeName}>{r.title}</Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
