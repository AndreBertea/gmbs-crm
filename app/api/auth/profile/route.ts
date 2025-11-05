import { NextResponse } from 'next/server'
import { createServerSupabase, bearerFrom } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function PATCH(req: Request) {
  const token = bearerFrom(req)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = createServerSupabase(token)
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  const patch: Record<string, unknown> = {}

  const color = typeof body.color === 'string' ? body.color.trim() : typeof body.btn_color === 'string' ? body.btn_color.trim() : null
  if (color !== null) patch.color = color || null

  if (typeof body.firstname === 'string') patch.firstname = body.firstname.trim() || null
  else if (typeof body.prenom === 'string') patch.firstname = String(body.prenom).trim() || null

  if (typeof body.lastname === 'string') patch.lastname = body.lastname.trim() || null
  else if (typeof body.name === 'string') patch.lastname = String(body.name).trim() || null

  if (typeof body.surnom === 'string') patch.code_gestionnaire = body.surnom.trim() || null
  else if (typeof body.code_gestionnaire === 'string') patch.code_gestionnaire = String(body.code_gestionnaire).trim() || null

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true })
  const { data: me, error: selErr } = await supabase.from('users').select('id').maybeSingle()
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 })
  if (!me) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const { error } = await supabase.from('users').update(patch).eq('id', me.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
