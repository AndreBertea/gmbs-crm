import { NextResponse } from "next/server"
import { createIntervention, listInterventions } from "@/lib/api/interventions"
import type { InterventionStatusValue } from "@/types/interventions"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get("status") as InterventionStatusValue | null
  const search = searchParams.get("search") ?? undefined
  const take = searchParams.get("take")
  const skip = searchParams.get("skip")

  const result = await listInterventions({
    status: statusParam ?? undefined,
    search,
    take: take ? Number.parseInt(take, 10) : undefined,
    skip: skip ? Number.parseInt(skip, 10) : undefined,
    withDocuments: searchParams.get("withDocuments") === "true",
  })

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const result = await createIntervention(payload)
    if ("duplicates" in result) {
      return NextResponse.json(result, { status: 409 })
    }
    return NextResponse.json(result.intervention, { status: 201 })
  } catch (error) {
    console.error("[api/interventions] POST failed", error)
    return NextResponse.json({ message: (error as Error).message }, { status: 400 })
  }
}
