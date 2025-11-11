import { NextResponse } from "next/server"
import { deleteIntervention, getIntervention, updateIntervention } from "@/lib/api/interventions"
import { bearerFrom, createServerSupabase } from "@/lib/supabase/server"

type Params = {
  params: Promise<{
    id: string
  }>
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
    const token = bearerFrom(request)
    if (!token) {
      return NextResponse.json({ message: "Authentification requise" }, { status: 401 })
    }

    const supabase = createServerSupabase(token)
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth?.user?.id
    if (!userId) {
      return NextResponse.json({ message: "Utilisateur non authentifié" }, { status: 401 })
    }

    const { data: roleRows, error: rolesError } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", userId)

    if (rolesError && rolesError.code !== "PGRST116") {
      console.warn("[api/interventions/:id] Impossible de récupérer les rôles utilisateur", rolesError)
    }

    const roles =
      roleRows
        ?.map((entry: any) => entry?.roles?.name)
        .filter((value: unknown): value is string => typeof value === "string") ?? []

    const isAdmin = roles.some((role) => role.toLowerCase().includes("admin"))

    const payload = await request.json()
    const wantsContextUpdate =
      Object.prototype.hasOwnProperty.call(payload, "context") ||
      Object.prototype.hasOwnProperty.call(payload, "contexte_intervention")

    if (wantsContextUpdate && !isAdmin) {
      return NextResponse.json(
        { message: "Seuls les administrateurs peuvent modifier le contexte après création" },
        { status: 403 },
      )
    }

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
