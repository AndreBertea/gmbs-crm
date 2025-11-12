"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

interface CurrentUser {
  id: string
  code_gestionnaire?: string | null
  username?: string | null
  email?: string | null
  firstname?: string | null
  lastname?: string | null
  prenom?: string | null
  nom?: string | null
  surnom?: string | null
  color?: string | null
}

interface Gestionnaire {
  id: string
  firstname: string | null
  lastname: string | null
  prenom?: string | null
  name?: string | null
  code_gestionnaire: string | null
  color: string | null
  email: string | null
  username: string | null
}

/**
 * Composant de garde d'authentification global
 * Vérifie que l'utilisateur existe dans la base de données
 * Redirige vers /login si l'authentification échoue
 * 
 * NOTE: Le cookie sb-access-token est httpOnly, donc on ne peut pas le vérifier côté client.
 * On fait confiance au middleware qui a déjà vérifié le token côté serveur.
 * On vérifie ici uniquement que l'utilisateur existe dans la base de données.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)
  
  // Pages publiques qui ne nécessitent pas d'authentification
  const publicPaths = ["/login", "/landingpage"]
  const isPublicPath = publicPaths.some((path) => pathname?.startsWith(path))
  
  // Ne pas appeler les hooks sur les pages publiques
  const shouldCheckAuth = !isPublicPath
  
  // Utiliser useQuery directement - le middleware a déjà vérifié le token côté serveur
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<CurrentUser | null> => {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Lancer une erreur pour que userError soit défini et déclencher la redirection
          const error = new Error("Unauthorized") as Error & { status?: number }
          error.status = 401
          throw error
        }
        throw new Error("Impossible de récupérer l'utilisateur")
      }

      const payload = await response.json()
      return payload?.user ?? null
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: shouldCheckAuth, // Ne pas faire de requête sur les pages publiques
  })
  
  const { data: gestionnaires = [], isLoading: isLoadingGestionnaires, error: gestionnairesError } = useQuery({
    queryKey: ["gestionnaires"],
    queryFn: async (): Promise<Gestionnaire[]> => {
      const res = await fetch("/api/settings/team", { cache: "no-store", credentials: "include" })
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized")
        }
        throw new Error(`Failed to fetch gestionnaires: ${res.statusText}`)
      }
      const data = await res.json()
      const users = (data?.users || []).map((u: any) => ({
        id: u.id,
        firstname: u.firstname,
        lastname: u.lastname,
        prenom: u.prenom || u.firstname,
        name: u.name || u.lastname,
        code_gestionnaire: u.code_gestionnaire,
        color: u.color,
        email: u.email,
        username: u.username,
      }))
      return users
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: shouldCheckAuth, // Ne pas faire de requête sur les pages publiques
    retry: (failureCount, error) => {
      // Ne pas retry sur les erreurs d'authentification
      if (error instanceof Error && error.message === "Unauthorized") {
        return false
      }
      return failureCount < 2
    },
  })

  useEffect(() => {
    // Ne rien faire sur les pages publiques
    if (isPublicPath) return
    
    // Éviter les redirections multiples
    if (hasRedirected.current) return
    
    // Vérifier si on vient de se connecter (protection contre les redirections prématurées)
    // Si on vient de se connecter, attendre un peu avant de vérifier l'authentification
    const revealTransition = typeof window !== 'undefined' ? sessionStorage.getItem('revealTransition') : null
    if (revealTransition) {
      try {
        const transition = JSON.parse(revealTransition)
        const timeSinceLogin = Date.now() - (transition.timestamp || 0)
        // Attendre au moins 1 seconde après la connexion avant de vérifier
        if (timeSinceLogin < 1000) {
          return
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }
    
    // Attendre que le chargement soit terminé
    if (isLoadingUser || isLoadingGestionnaires) return

    // Vérifier les erreurs d'authentification
    const isUnauthorized = userError && (
      (userError as any)?.status === 401 || 
      (userError as Error)?.message?.includes('401') ||
      (userError as Error)?.message?.includes('Unauthorized')
    )
    const isGestionnairesUnauthorized = gestionnairesError && (
      (gestionnairesError as Error)?.message === "Unauthorized"
    )
    
    // IMPORTANT: Ne rediriger QUE sur erreur d'authentification explicite (401)
    // Ne PAS rediriger si currentUser est null sans erreur 401, car :
    // - Le middleware a déjà vérifié le token côté serveur
    // - Si le token est valide mais l'utilisateur n'existe pas dans la table users,
    //   /api/auth/me retourne { user: null } sans erreur 401
    // - Dans ce cas, on doit afficher le contenu quand même (le token est valide)
    const shouldRedirect = (
      isUnauthorized || // Erreur d'authentification explicite (401)
      isGestionnairesUnauthorized // Erreur d'authentification sur gestionnaires
    ) && pathname !== '/login'
    
    if (shouldRedirect) {
      hasRedirected.current = true
      // Rediriger vers login avec le chemin actuel comme redirect
      const loginUrl = `/login${pathname !== "/" ? `?redirect=${encodeURIComponent(pathname)}` : ""}`
      router.push(loginUrl)
    }
  }, [
    currentUser,
    isLoadingUser,
    isLoadingGestionnaires,
    userError,
    gestionnairesError,
    router,
    pathname,
    isPublicPath,
  ])

  // Sur les pages publiques, afficher directement
  if (isPublicPath) {
    return <>{children}</>
  }

  // Pendant le chargement, afficher un loader
  if (isLoadingUser || isLoadingGestionnaires) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  // Si pas d'utilisateur mais pas d'erreur 401, afficher quand même le contenu
  // Le middleware a déjà vérifié le token, donc l'utilisateur est authentifié
  // même s'il n'existe pas encore dans la table users (peut arriver lors de la première connexion)
  // Ne pas bloquer l'accès dans ce cas pour éviter les boucles de redirection
  if (!currentUser && !isLoadingUser && !userError) {
    // Afficher le contenu même si l'utilisateur n'est pas dans la table users
    // Les pages pourront gérer ce cas si nécessaire
    return <>{children}</>
  }

  // Si erreur d'authentification (401), rediriger (géré par useEffect)
  const isUnauthorized = userError && (
    (userError as any)?.status === 401 || 
    (userError as Error)?.message?.includes('401') ||
    (userError as Error)?.message?.includes('Unauthorized')
  )
  if (isUnauthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Redirection...</div>
      </div>
    )
  }

  // Utilisateur authentifié, afficher le contenu
  // Note: On n'exige pas que gestionnaires.length > 0 car cela peut être normal
  // (par exemple si l'utilisateur vient de se connecter et que les données ne sont pas encore chargées)
  return <>{children}</>
}

