import { NextResponse } from "next/server"
import { fetchInvoicePreview } from "@/lib/api/invoice2go"
import { InvoiceLookupSchema } from "@/types/interventions"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { invoice2goId } = InvoiceLookupSchema.parse(payload)
    const preview = await fetchInvoicePreview(invoice2goId)
    return NextResponse.json(preview)
  } catch (error) {
    console.error("[api/interventions/invoice] POST failed", error)
    return NextResponse.json({ message: (error as Error).message }, { status: 400 })
  }
}
