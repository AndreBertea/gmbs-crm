import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'No DB' }, { status: 500 })
  const { identifier } = await req.json().catch(() => ({}))
  if (!identifier) return NextResponse.json({ error: 'missing_identifier' }, { status: 400 })
  if (String(identifier).includes('@')) return NextResponse.json({ email: identifier })
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('username', identifier)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.email) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ email: data.email })
}

