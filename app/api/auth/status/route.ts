import { NextResponse } from 'next/server'
import { createServerSupabase, bearerFrom } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const ALLOWED = new Set(['connected','busy','dnd','offline'])

export async function PATCH(req: Request) {
  const token = bearerFrom(req)
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const supabase = createServerSupabase(token)
  const body = await req.json().catch(() => ({}))
  const status = String(body?.status || '')
  if (!ALLOWED.has(status)) return NextResponse.json({ error: 'bad_status' }, { status: 400 })

  const { data: authUser, error: authError } = await supabase.auth.getUser()
  if (authError) return NextResponse.json({ error: authError.message }, { status: 401 })
  const userId = authUser?.user?.id || null
  const userEmail = authUser?.user?.email || null

  let profile: { id: string } | null = null
  let profileError: any = null

  if (userId) {
    const byId = await supabase.from('users').select('id').eq('id', userId).maybeSingle()
    profile = byId.data
    profileError = byId.error
  }

  if ((!profile || profileError) && userEmail) {
    const byEmail = await supabase.from('users').select('id').eq('email', userEmail).maybeSingle()
    profile = byEmail.data
    profileError = byEmail.error
  }

  if (profileError && profileError.code !== 'PGRST116') {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (!profile) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const patch: any = { status }
  if (status === 'connected') patch.last_seen_at = new Date().toISOString()
  const { error } = await supabase.from('users').update(patch).eq('id', profile.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
