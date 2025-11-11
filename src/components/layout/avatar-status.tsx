"use client"

import * as React from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { LogOut, Settings as SettingsIcon, User as UserIcon } from "lucide-react"
import { supabase } from '@/lib/supabase-client'
import { useQueryClient } from "@tanstack/react-query"

type Me = {
  id: string
  firstname?: string | null
  lastname?: string | null
  prenom?: string | null
  name?: string | null
  email: string | null
  status: string | null
  color: string | null
  code_gestionnaire?: string | null
  username?: string | null
}

export function AvatarStatus() {
  const queryClient = useQueryClient()
  const [me, setMe] = React.useState<Me | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const load = React.useCallback(async () => {
    try {
      // Utiliser directement /api/auth/me qui lit depuis les cookies HTTP-only
      // Cela garantit que chaque navigateur/fenêtre a sa propre session isolée
      const res = await fetch('/api/auth/me', { 
        cache: 'no-store', 
        credentials: 'include' // Inclure les cookies dans la requête
      })
      const j = await res.json()
      setMe(j?.user || null)
    } catch {
      setMe(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const status = (me?.status || 'offline') as 'connected' | 'busy' | 'dnd' | 'offline'
  const label = status === 'connected' ? 'En ligne' : status === 'busy' ? 'Occupé' : status === 'dnd' ? 'Ne pas déranger' : 'Hors ligne'
  const statusColorClass = status === 'connected' ? 'bg-green-500' : status === 'busy' ? 'bg-orange-500' : status === 'dnd' ? 'bg-red-500' : 'bg-gray-400'

  async function setStatus(next: 'connected' | 'busy' | 'dnd' | 'offline') {
    // Les cookies HTTP-only seront automatiquement inclus dans la requête
    // Pas besoin de récupérer le token depuis localStorage
    await fetch('/api/auth/status', { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Inclure les cookies dans la requête
      body: JSON.stringify({ status: next }) 
    })
    setMe((m) => (m ? { ...m, status: next } : m))
  }

  async function logout() {
    try {
      await setStatus('offline')
    } catch (error) {
      console.warn('[avatar-status] Failed to set offline status before logout', error)
    }
    
    // Invalider et supprimer le cache React Query AVANT la déconnexion
    queryClient.removeQueries({ queryKey: ["currentUser"] })
    queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    
    // Nettoyer sessionStorage pour l'animation
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('revealTransition')
    }
    
    // Déconnexion Supabase
    await supabase.auth.signOut()
    
    // Supprimer les cookies de session
    await fetch('/api/auth/session', { method: 'DELETE' })
    
    // Redirection
    window.location.href = '/login'
  }

  const userColor = me?.color || undefined
  const borderColor = userColor || '#e5e7eb'
  const bgColor = userColor || undefined
  const textColor = userColor ? '#ffffff' : '#1f2937'
  const displayName = React.useMemo(() => {
    if (!me) return ''
    const first = me.firstname ?? me.prenom
    const last = me.lastname ?? me.name
    const full = [first, last].filter(Boolean).join(' ').trim()
    if (full) return full
    if (me.email) return String(me.email)
    return ''
  }, [me])
  const initials = React.useMemo(() => {
    const first = me?.firstname ?? me?.prenom
    const last = me?.lastname ?? me?.name
    if (first || last) {
      return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || 'U'
    }
    if (me?.email) {
      const local = String(me.email).split('@')[0] || ''
      return (local.slice(0, 2) || 'U').toUpperCase()
    }
    return 'U'
  }, [me])

  if (!isMounted) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    )
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="relative h-9 w-9 rounded-full outline-none focus-visible:ring-1 focus-visible:ring-ring border-4 grid place-items-center font-semibold text-xs uppercase select-none"
            style={{ borderColor: borderColor || '#e5e7eb', background: bgColor, color: textColor }}
            aria-label={displayName || 'Profil'}
            title={displayName || ''}
          >
            {initials}
            <span
              aria-label={`Status ${label}`}
              className={`absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${statusColorClass}`}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex items-center gap-2">
              <div
                className="relative h-9 w-9 rounded-full border-4 grid place-items-center font-semibold text-xs uppercase select-none"
                style={{ borderColor: borderColor || '#e5e7eb', background: bgColor, color: textColor }}
              >
                {initials}
                <span
                  aria-label={`Status ${label}`}
                  className={`absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${statusColorClass}`}
                />
              </div>
              <div className="text-xs">
                <div className="font-medium">{displayName || '—'}</div>
                <div className="text-muted-foreground">{me?.email || ''}</div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings/interface" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Paramètres
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:bg-red-50" onSelect={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
