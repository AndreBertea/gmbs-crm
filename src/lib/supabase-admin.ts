import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { serverEnv } from './env.server'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY

// Vérification plus stricte des variables d'environnement
const hasValidConfig = supabaseUrl && serviceKey && supabaseUrl !== '' && serviceKey !== ''

if (!hasValidConfig) {
  console.warn('[supabase-admin] Missing or invalid SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

// Variable pour stocker le client singleton côté serveur
let adminClientInstance: SupabaseClient | null = null

/**
 * Crée ou retourne le client Supabase admin (service role)
 * IMPORTANT: Ce client ne doit être utilisé QUE côté serveur (routes API, SSR, etc.)
 * Il ne doit JAMAIS être utilisé côté client car il utilise la service role key
 */
function getSupabaseAdminClient(): SupabaseClient | null {
  // Ne créer le client QUE côté serveur pour éviter les conflits de storageKey
  if (typeof window !== 'undefined') {
    // Côté client : ne pas créer de client admin
    // Si ce code s'exécute côté client, c'est une erreur de configuration
    console.error(
      '[supabase-admin] ⚠️ ERREUR: Tentative d\'utilisation du client admin côté client. ' +
      'Le client admin ne doit être utilisé QUE dans les routes API côté serveur.'
    )
    return null
  }

  // Côté serveur : créer le client si nécessaire
  if (!hasValidConfig) {
    return null
  }

  if (!adminClientInstance) {
    // Créer le client avec la service role key (bypass l'auth, donc pas besoin de storageKey)
    adminClientInstance = createClient(supabaseUrl!, serviceKey!, {
      auth: {
        // Désactiver complètement l'auth pour éviter tout conflit de storageKey
        // Le client admin utilise la service role key qui bypass l'auth de toute façon
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        // Utiliser un storageKey unique pour éviter les conflits même si l'auth était activée
        storageKey: 'supabase.admin.service-role.token'
      }
    })
  }

  return adminClientInstance
}

// Export du client admin (lazy loading côté serveur uniquement)
export const supabaseAdmin = hasValidConfig ? getSupabaseAdminClient() : null
