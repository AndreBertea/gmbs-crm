import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'No DB' }, { status: 500 })
  try {
    const { amount = 1, reason = 'chat', tier = 'consumption' } = await req.json()
    const n = Math.max(1, parseInt(String(amount), 10) || 1)
    // Insert usage event (negative delta); trigger will update billing_state
    const { error } = await supabaseAdmin.from('usage_events').insert({ delta: -n, reason, chat_tier: tier })
    if (error) throw new Error(error.message)
    const { data } = await supabaseAdmin.from('billing_state').select('requests_remaining').limit(1).maybeSingle()
    const remaining = data?.requests_remaining ?? 0
    return NextResponse.json({ ok: true, requestsRemaining: remaining })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad payload' }, { status: 400 })
  }
}

