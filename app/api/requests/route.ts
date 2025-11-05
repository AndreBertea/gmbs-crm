import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ requestsRemaining: 0 })
  const { data } = await supabaseAdmin.from('billing_state').select('requests_remaining').limit(1).maybeSingle()
  const remaining = data?.requests_remaining ?? 0
  return NextResponse.json({ requestsRemaining: remaining })
}

