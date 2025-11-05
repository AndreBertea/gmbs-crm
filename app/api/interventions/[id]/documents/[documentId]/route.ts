import { NextResponse } from "next/server"
import { removeInterventionDocument } from "@/lib/api/documents"

type Params = {
  params: {
    id: string
    documentId: string
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  await removeInterventionDocument({ documentId: params.documentId })
  return NextResponse.json({ ok: true })
}
