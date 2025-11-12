import { NextResponse } from 'next/server'
import { createServerSupabase, bearerFrom } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * GET /api/user-preferences
 * Récupère les préférences de l'utilisateur connecté
 */
export async function GET(req: Request) {
  try {
    // Obtenir le token d'authentification
    let token = bearerFrom(req)
    if (!token) {
      const cookieStore = await cookies()
      token = cookieStore.get('sb-access-token')?.value || null
    }

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Obtenir l'ID de l'utilisateur depuis Supabase Auth
    const supabase = createServerSupabase(token)
    const { data: authUser, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser?.user?.id) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
    }

    const userId = authUser.user.id

    // Utiliser le client admin pour contourner les politiques RLS
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      // Si l'erreur est "no rows returned" (PGRST116), retourner null au lieu d'une erreur
      if (error.code === 'PGRST116') {
        return NextResponse.json({ data: null })
      }
      console.error('[user-preferences] Erreur lors de la récupération:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (e: any) {
    console.error('[user-preferences] Erreur inattendue:', e)
    return NextResponse.json({ error: e?.message || 'Erreur inattendue' }, { status: 500 })
  }
}

/**
 * PUT /api/user-preferences
 * Crée ou met à jour les préférences de l'utilisateur connecté
 */
export async function PUT(req: Request) {
  try {
    // Obtenir le token d'authentification
    let token = bearerFrom(req)
    if (!token) {
      const cookieStore = await cookies()
      token = cookieStore.get('sb-access-token')?.value || null
    }

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Obtenir l'ID de l'utilisateur depuis Supabase Auth
    const supabase = createServerSupabase(token)
    const { data: authUser, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser?.user?.id) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 401 })
    }

    const userId = authUser.user.id

    // Lire le body de la requête
    const body = await req.json().catch(() => ({}))
    const { speedometer_margin_average_show_percentage, speedometer_margin_total_show_percentage } = body

    // Utiliser le client admin pour contourner les politiques RLS
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 })
    }

    // Vérifier si les préférences existent déjà
    const { data: existing } = await supabaseAdmin
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    let result
    if (existing) {
      // Mise à jour
      const updateData: any = {}
      if (speedometer_margin_average_show_percentage !== undefined) {
        updateData.speedometer_margin_average_show_percentage = speedometer_margin_average_show_percentage
      }
      if (speedometer_margin_total_show_percentage !== undefined) {
        updateData.speedometer_margin_total_show_percentage = speedometer_margin_total_show_percentage
      }

      const { data, error } = await supabaseAdmin
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('[user-preferences] Erreur lors de la mise à jour:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    } else {
      // Insertion
      const { data, error } = await supabaseAdmin
        .from('user_preferences')
        .insert({
          user_id: userId,
          speedometer_margin_average_show_percentage: speedometer_margin_average_show_percentage ?? true,
          speedometer_margin_total_show_percentage: speedometer_margin_total_show_percentage ?? true,
        })
        .select()
        .single()

      if (error) {
        console.error('[user-preferences] Erreur lors de la création:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    }

    return NextResponse.json({ data: result })
  } catch (e: any) {
    console.error('[user-preferences] Erreur inattendue:', e)
    return NextResponse.json({ error: e?.message || 'Erreur inattendue' }, { status: 500 })
  }
}

