import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST() {
  return NextResponse.json({ error: 'restore_not_supported' }, { status: 400 })
}
