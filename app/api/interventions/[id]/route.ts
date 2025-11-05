import { NextResponse } from "next/server"
import { deleteIntervention, getIntervention, updateIntervention } from "@/lib/api/interventions"

type Params = {
  params: {
    id: string
  }
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const intervention = await getIntervention({ id })
  if (!intervention) {
    return NextResponse.json({ message: "Intervention introuvable" }, { status: 404 })
  }
  return NextResponse.json(intervention)
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const payload = await request.json()
    const intervention = await updateIntervention(id, payload)
    return NextResponse.json(intervention)
  } catch (error) {
    console.error("[api/interventions/:id] PATCH failed", error)
    return NextResponse.json({ message: (error as Error).message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  await deleteIntervention(id)
  return NextResponse.json({ ok: true })
}
