import { NextResponse } from "next/server"
import { removeInterventionDocument } from "@/lib/api/documents"

type Params = {
  params: Promise<{
    id: string
    documentId: string
  }>
}

export async function DELETE(_request: Request, { params }: Params) {
  const { documentId } = await params
  await removeInterventionDocument({ documentId })
  return NextResponse.json({ ok: true })
}
