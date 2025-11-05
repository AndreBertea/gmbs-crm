import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

function getSecret() {
  return process.env.PURCHASE_LINK_SECRET || process.env.CREDITS_SECRET || "dev-secret"
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
}

function hoursFromNow(hours: number) {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() < Date.now()
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "No DB" }, { status: 500 })
  try {
    const { userId, expiresInHours, expiresAt } = (await req.json()) as {
      userId: string
      expiresInHours?: number
      expiresAt?: string
    }
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
    const exp = expiresAt ? new Date(expiresAt) : hoursFromNow(Math.max(1, Math.floor(expiresInHours || 48)))
    const id = crypto.randomUUID()
    const payload = `${id}:${userId}:${exp.toISOString()}`
    const token = `${id}.${sign(payload)}`
    const { error } = await supabaseAdmin.from("crm_purchase_links").insert({
      id,
      user_id: userId,
      token,
      expires_at: exp.toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id, token, expiresAt: exp.toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad payload" }, { status: 400 })
  }
}

export async function GET(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "No DB" }, { status: 500 })
  const url = new URL(req.url)
  const token = url.searchParams.get("token") || ""
  if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("crm_purchase_links")
    .select("id, user_id, token, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ ok: false, error: "invalid" }, { status: 404 })
  if (data.consumed_at) return NextResponse.json({ ok: false, error: "consumed" }, { status: 403 })
  if (isExpired(data.expires_at)) return NextResponse.json({ ok: false, error: "expired" }, { status: 403 })
  // Optionally re-verify signature shape
  const [idPart, sigPart] = token.split(".")
  if (!idPart || !sigPart) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  const expected = sign(`${data.id}:${data.user_id}:${new Date(data.expires_at!).toISOString()}`)
  if (expected !== sigPart) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  return NextResponse.json({ ok: true, linkId: data.id, userId: data.user_id })
}

