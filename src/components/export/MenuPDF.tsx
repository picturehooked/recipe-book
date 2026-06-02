import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Recipe } from '@/types'

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 80,
    paddingTop: 70,
    paddingBottom: 70,
  },
  inner: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  title: {
    fontFamily: 'Times-BoldItalic',
    fontSize: 48,            // was 46, +2
    color: '#111111',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  rule: {
    width: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    alignSelf: 'center',
  },
  catBlock: {
    alignItems: 'center',
  },
  catName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,            // was 8, +2
    color: '#111111',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 3.5,
    marginBottom: 5,
  },
  recipeName: {
    fontFamily: 'Times-Roman',
    fontSize: 14,            // was 12, +2
    color: '#333333',
    textAlign: 'center',
    lineHeight: 1.6,
  },
})

// Sort by DB-defined sort_order, then A→Z within each category
function buildMenuGroups(recipes: Recipe[]): { name: string; recipes: Recipe[] }[] {
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
  return Array.from(map.values())
    .sort((a, b) => a.sortOrder !== b.sortOrder
      ? a.sortOrder - b.sortOrder
      : a.name.localeCompare(b.name))
    .map(g => ({ name: g.name, recipes: g.recipes.slice().sort((a, b) => a.title.localeCompare(b.title)) }))
}

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
          <View style={{ alignItems: 'center' }}>
            <Text style={s.title}>{displayTitle}</Text>
            <View style={s.rule} />
          </View>
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
