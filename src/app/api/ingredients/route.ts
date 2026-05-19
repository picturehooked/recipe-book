import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const query = req.nextUrl.searchParams.get('q') ?? ''

  const db = supabase
    .from('ingredients')
    .select('*, ingredient_category:ingredient_categories(id, name)')
    .order('name')

  const { data, error } = query.length >= 2
    ? await db.ilike('name', `%${query}%`).limit(15)
    : await db.limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('ingredients')
    .upsert({ name: name.trim() }, { onConflict: 'name' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
