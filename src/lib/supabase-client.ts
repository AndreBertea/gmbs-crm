import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Client Supabase avec configuration centralisée
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Client Supabase avec service role (pour les opérations admin)
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);