import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

// Vérification plus stricte des variables d'environnement
const hasValidConfig = supabaseUrl && serviceKey && supabaseUrl !== '' && serviceKey !== ''

if (!hasValidConfig) {
  console.warn('[supabase-admin] Missing or invalid SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

// Créer le client seulement si la configuration est valide
export const supabaseAdmin = hasValidConfig 
  ? createClient(supabaseUrl, serviceKey)
  : null

