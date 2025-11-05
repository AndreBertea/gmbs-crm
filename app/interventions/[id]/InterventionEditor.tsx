"use client"

import { useRouter } from "next/navigation"
import InterventionForm from "@/components/interventions/InterventionForm"
import type { InterventionWithDocuments } from "@/types/interventions"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

type Props = {
  intervention: InterventionWithDocuments
}

export default function InterventionEditor({ intervention }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  return (
    <InterventionForm
      mode="edit"
      interventionId={intervention.id}
      defaultValues={{
        name: intervention.name,
        address: intervention.address,
        context: intervention.context,
        agency: intervention.agency ?? undefined,
        consigne: intervention.consigne ?? undefined,
        status: intervention.status,
        dueAt: intervention.dueAt ? new Date(intervention.dueAt) : undefined,
        artisanId: intervention.artisanId ?? undefined,
        managerId: intervention.managerId ?? undefined,
        invoice2goId: intervention.invoice2goId ?? undefined,
      }}
      onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.intervention(intervention.id) })
        router.refresh()
      }}
    />
  )
}
