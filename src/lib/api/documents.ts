import { randomUUID } from "crypto"
import type { InterventionDocumentDTO } from "@/types/interventions"

const logNotImplemented = (action: string) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[documents] ${action} non implémenté. À connecter à Supabase Storage.`)
  }
}

type UploadParams = {
  interventionId: string
  fileName: string
  mimeType: string
  buffer: ArrayBuffer | Buffer
  metadata?: Record<string, unknown>
}

type UploadResult = {
  document: InterventionDocumentDTO
  publicUrl?: string
}

export async function uploadInterventionDocument({
  interventionId,
  fileName,
  mimeType,
  buffer,
  metadata,
}: UploadParams): Promise<UploadResult> {
  logNotImplemented("uploadInterventionDocument")

  const storagePath = `${interventionId}/${Date.now()}-${fileName}`
  const sizeBytes = buffer instanceof ArrayBuffer ? buffer.byteLength : Buffer.isBuffer(buffer) ? buffer.byteLength : 0
  const createdAt = new Date().toISOString()

  const document: InterventionDocumentDTO = {
    id: randomUUID(),
    interventionId,
    name: fileName,
    mimeType,
    storagePath,
    metadata: metadata ?? null,
    publicUrl: null,
    sizeBytes,
    createdAt,
  }

  return {
    document,
    publicUrl: undefined,
  }
}

type RemoveParams = {
  documentId: string
}

export async function removeInterventionDocument({ documentId }: RemoveParams) {
  logNotImplemented("removeInterventionDocument")
  return { documentId }
}

export async function listInterventionDocuments(_interventionId: string) {
  logNotImplemented("listInterventionDocuments")
  return [] as InterventionDocumentDTO[]
}
