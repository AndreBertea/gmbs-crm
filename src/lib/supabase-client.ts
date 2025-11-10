import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Déclaration TypeScript pour les propriétés globales sur window
declare global {
  interface Window {
    __supabaseClient?: SupabaseClient;
    __supabaseAdminClient?: SupabaseClient;
    __supabaseClientLock?: boolean;
    __supabaseAdminClientLock?: boolean;
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

// Fonction helper pour créer l'instance Supabase Admin de manière thread-safe
// IMPORTANT: Le client admin ne doit être utilisé QUE côté serveur (routes API, SSR, scripts)
function createSupabaseAdminClientSingleton(): SupabaseClient {
  // Ne créer le client QUE côté serveur pour éviter les conflits de storageKey
  // Cette fonction ne devrait jamais être appelée côté client grâce au proxy conditionnel
  if (typeof window !== 'undefined') {
    throw new Error(
      'createSupabaseAdminClientSingleton ne doit pas être appelée côté client. ' +
      'Ceci indique un problème de configuration.'
    );
  }
  
  // Sur le serveur, créer une nouvelle instance à chaque fois (SSR)
  // Le client admin utilise la service role key qui bypass l'auth
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // Désactiver l'auth pour éviter tout conflit de storageKey
      // Le client admin utilise la service role key qui bypass l'auth de toute façon
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      // Utiliser un storageKey unique pour éviter les conflits même si l'auth était activée
      storageKey: 'supabase.admin.service-role.token'
    }
  });
}

// Créer un objet avec des getters qui vérifient toujours window à chaque accès
// Cela garantit qu'une seule instance est utilisée, même si le module est chargé plusieurs fois
const supabaseProxy = {} as SupabaseClient;
const supabaseAdminProxy = {} as SupabaseClient;

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

const supabaseAdminHandler: ProxyHandler<SupabaseClient> = {
  get(_target, prop) {
    // Ne créer le client admin que s'il est vraiment accédé (lazy loading)
    // Cela évite la création inutile côté client où il n'est jamais utilisé
    const instance = createSupabaseAdminClientSingleton();
    if (!instance) {
      throw new Error(
        'supabaseAdmin ne peut pas être utilisé côté client. ' +
        'Utilisez le client normal (supabase) côté client ou utilisez supabaseAdmin uniquement dans les routes API.'
      );
    }
    const value = (instance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
  set(_target, prop, value) {
    const instance = createSupabaseAdminClientSingleton();
    if (!instance) {
      throw new Error(
        'supabaseAdmin ne peut pas être utilisé côté client. ' +
        'Utilisez le client normal (supabase) côté client ou utilisez supabaseAdmin uniquement dans les routes API.'
      );
    }
    (instance as any)[prop] = value;
    return true;
  }
};

// Client Supabase avec configuration centralisée (singleton global)
export const supabase: SupabaseClient = new Proxy(supabaseProxy, supabaseHandler);

// Client Supabase avec service role (pour les opérations admin)
// IMPORTANT: Ne créer le proxy QUE côté serveur pour éviter les warnings
// Côté client, retourner un proxy qui throw une erreur si utilisé
export const supabaseAdmin: SupabaseClient = typeof window === 'undefined'
  ? new Proxy(supabaseAdminProxy, supabaseAdminHandler)
  : new Proxy(supabaseAdminProxy, {
      get() {
        throw new Error(
          'supabaseAdmin ne peut pas être utilisé côté client. ' +
          'Utilisez le client normal (supabase) côté client ou utilisez supabaseAdmin uniquement dans les routes API.'
        );
      },
      set() {
        throw new Error(
          'supabaseAdmin ne peut pas être utilisé côté client. ' +
          'Utilisez le client normal (supabase) côté client ou utilisez supabaseAdmin uniquement dans les routes API.'
        );
      }
    } as ProxyHandler<SupabaseClient>);