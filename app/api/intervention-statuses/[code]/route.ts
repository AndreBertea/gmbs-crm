import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase-admin"

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 })
  }

  const { code } = await params
  if (!code) {
    return NextResponse.json({ error: "Code de statut manquant" }, { status: 400 })
  }

  let body: { color?: string }
  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const color = body.color?.trim()
  if (!color) {
    return NextResponse.json({ error: "Couleur manquante" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("intervention_statuses")
    .update({ color })
    .eq("code", code)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
