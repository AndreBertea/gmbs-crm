import { NextResponse } from "next/server"
import { listInterventionDocuments, uploadInterventionDocument } from "@/lib/api/documents"

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const documents = await listInterventionDocuments(id)
  return NextResponse.json({ documents })
}

export async function POST(request: Request, { params }: Params) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ message: "FormData requis" }, { status: 400 })
  }

  const { id } = await params
  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Fichier manquant" }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const document = await uploadInterventionDocument({
    interventionId: id,
    fileName: file.name,
    mimeType: file.type,
    buffer,
    metadata: formData.get("metadata") ? JSON.parse(String(formData.get("metadata"))) : undefined,
  })

  return NextResponse.json(document, { status: 201 })
}
