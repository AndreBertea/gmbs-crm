import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'No DB' }, { status: 500 })
  try {
    const { value } = await req.json()
    const n = Math.max(0, parseInt(String(value), 10) || 0)
    // Ensure a row exists
    const { data } = await supabaseAdmin.from('billing_state').select('id').limit(1).maybeSingle()
    if (!data) {
      await supabaseAdmin.from('billing_state').insert({ current_plan_id: 'starter', status: 'inactive', requests_remaining: n })
    } else {
      await supabaseAdmin.from('billing_state').update({ requests_remaining: n, updated_at: new Date().toISOString() }).eq('id', data.id)
    }
    return NextResponse.json({ ok: true, requestsRemaining: n })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad payload' }, { status: 400 })
  }
}

