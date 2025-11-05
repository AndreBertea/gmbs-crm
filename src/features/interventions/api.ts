import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
// It is fine to construct client here for stubs
export const supabase = createClient(supabaseUrl, supabaseKey)

export type ListParams = {
  status?: string
  userId?: string
  from?: string
  to?: string
  sort?: 'created' | 'due' | 'margin'
  dir?: 'asc' | 'desc'
}

export async function listInterventions(params: ListParams = {}) {
  let q = supabase.from('interventions').select('*')
  if (params.status) q = q.eq('statut', params.status)
  if (params.userId) q = q.eq('assigned_user_id', params.userId) // TODO: missing DB column assigned_user_id (fallback attribueA)
  if (params.from) q = q.gte('date', params.from)
  if (params.to) q = q.lte('date', params.to)
  if (params.sort === 'due') q = q.order('due_date', { ascending: params.dir !== 'desc' }) // TODO: missing due_date if not created
  else if (params.sort === 'margin') q = q.order('margin', { ascending: params.dir !== 'desc' }) // TODO: margin may be null
  else q = q.order('date', { ascending: params.dir !== 'desc' })
  return q
}

export async function countsByStatus(filters: { userId?: string }) {
  // Aggregate counts per status (typed loosely to avoid TS issues in local tooling)
  let q: any = supabase.from('interventions').select('statut')
  if (filters.userId) q = q.eq('assigned_user_id', filters.userId) // TODO
  return q
}

export async function distinctStatuses() {
  return supabase.from('interventions').select('statut').neq('statut', '').order('statut', { ascending: true })
}

export async function updateStatus(id: string, status: string) {
  return supabase.from('interventions').update({ statut: status }).eq('id', id)
}

export async function updateDueDate(id: string, date: string) {
  return supabase.from('interventions').update({ due_date: date }).eq('id', id) // TODO: missing due_date if using date_intervention
}

export async function updateAmount(id: string, amount: number) {
  return supabase.from('interventions').update({ amount }).eq('id', id) // TODO: fallback cout_intervention
}

export async function updateCosts(id: string, costs: any) {
  return supabase.from('interventions').update({ costs }).eq('id', id) // TODO: missing costs jsonb
}

export async function updateAssignedUser(id: string, userId: string) {
  return supabase.from('interventions').update({ assigned_user_id: userId }).eq('id', id) // TODO
}

export async function updateClient(id: string, clientId: string) {
  return supabase.from('interventions').update({ tenant_id: clientId }).eq('id', id) // TODO: tenant mapping
}

export async function updateArtisan(id: string, artisanId: string) {
  return supabase.from('interventions').update({ artisan_id: artisanId }).eq('id', id) // TODO
}

export async function updateNotes(id: string, notes: string) {
  return supabase.from('interventions').update({ commentaire: notes }).eq('id', id)
}

// Optimistic update usage example (TanStack Query)
//
// const queryKey = ['interventions', params]
// const mutation = useMutation({
//   mutationFn: (vars: { id: string; status: string }) => updateStatus(vars.id, vars.status),
//   onMutate: async (vars) => {
//     await queryClient.cancelQueries({ queryKey })
//     const prev = queryClient.getQueryData<any>(queryKey)
//     queryClient.setQueryData<any>(queryKey, (old) => ({ ...old, data: old.data.map((i: any) => i.id === vars.id ? { ...i, statut: vars.status } : i) }))
//     return { prev }
//   },
//   onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev) },
//   onSettled: () => { queryClient.invalidateQueries({ queryKey }) }
// })
