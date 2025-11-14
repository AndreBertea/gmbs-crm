import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Déclaration TypeScript pour les propriétés globales sur window
declare global {
  interface Window {
    __supabaseClient?: SupabaseClient;
    __supabaseClientLock?: boolean;
  }
}

// Fonction helper pour créer l'instance Supabase de manière thread-safe
function createSupabaseClientSingleton(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Sur le serveur, créer une nouvelle instance à chaque fois (SSR)
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        storageKey: 'supabase.auth.token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  
  // Vérification atomique avec double-check locking pattern
  if (!window.__supabaseClient) {
    // Utiliser un lock pour éviter les créations simultanées
    if (!window.__supabaseClientLock) {
      window.__supabaseClientLock = true;
      try {
        // Double vérification après avoir acquis le lock
        if (!window.__supabaseClient) {
          window.__supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
            auth: {
              storageKey: 'supabase.auth.token',
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: true
            }
          });
        }
      } finally {
        window.__supabaseClientLock = false;
      }
    } else {
      // Si le lock est actif, attendre un peu et réessayer
      let attempts = 0;
      while (window.__supabaseClientLock && attempts < 50) {
        // Attente courte (non bloquante dans la pratique)
        attempts++;
      }
      // Si toujours pas d'instance après l'attente, créer une nouvelle (ne devrait jamais arriver)
      if (!window.__supabaseClient) {
        window.__supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
          auth: {
            storageKey: 'supabase.auth.token',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        });
      }
    }
  }
  
  return window.__supabaseClient;
}

// Créer un objet avec des getters qui vérifient toujours window à chaque accès
// Cela garantit qu'une seule instance est utilisée, même si le module est chargé plusieurs fois
const supabaseProxy = {} as SupabaseClient;

// Créer des proxies qui délèguent toutes les propriétés/méthodes à l'instance de window
const supabaseHandler: ProxyHandler<SupabaseClient> = {
  get(_target, prop) {
    const instance = createSupabaseClientSingleton();
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
  set(_target, prop, value) {
    const instance = createSupabaseClientSingleton();
    (instance as any)[prop] = value;
    return true;
  }
};

// Client Supabase avec configuration centralisée (singleton global)
export const supabase: SupabaseClient = new Proxy(supabaseProxy, supabaseHandler);

// IMPORTANT: Le client admin (supabaseAdmin) a été déplacé vers src/lib/supabase-admin.ts
// pour garantir que la service-role key reste strictement côté serveur et ne soit jamais
// exposée dans le bundle client. Utilisez l'import depuis supabase-admin.ts dans vos routes API.