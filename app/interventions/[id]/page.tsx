import { notFound } from "next/navigation"
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query"
import { getIntervention } from "@/lib/api/interventions"
import { queryKeys } from "@/lib/query-keys"
import { InterventionDetailContent } from "@/components/interventions/InterventionDetailContent"

type Params = {
  params: {
    id: string
  }
}

export default async function InterventionDetailPage({ params }: Params) {
  const { id } = params
  const intervention = await getIntervention({ id })

  if (!intervention) {
    notFound()
  }

  const queryClient = new QueryClient()
  queryClient.setQueryData(queryKeys.intervention(id), intervention)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InterventionDetailContent interventionId={id} mode="page" />
    </HydrationBoundary>
  )
}
