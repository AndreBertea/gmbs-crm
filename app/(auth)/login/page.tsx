"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase-client'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      let email = identifier
      if (!identifier.includes('@')) {
        const r = await fetch('/api/auth/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier }) })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j?.error || 'Identifiant introuvable')
        email = j.email
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      const refresh = session?.session?.refresh_token
      const expires_at = session?.session?.expires_at
      if (token && refresh) {
        await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: token, refresh_token: refresh, expires_at }) })
        await fetch('/api/auth/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: 'connected' }) })
      }
      const url = new URL(window.location.href)
      const redirect = url.searchParams.get('redirect') || '/dashboard'
      window.location.href = redirect
    } catch (e: any) {
      setError(e?.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left brand / illustration */}
      <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white relative overflow-hidden">
        <div className="z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/10 ring-1 ring-white/20 flex items-center justify-center text-lg font-bold">G</div>
            <div className="text-xl font-semibold tracking-wide">GMBS CRM</div>
          </div>
          <h1 className="mt-16 text-4xl font-bold leading-tight">Gérez votre activité<br/>avec précision</h1>
          <p className="mt-4 text-white/70 max-w-md">Accédez à vos interventions, équipe et facturation en toute sécurité. Authentification protégée par Supabase.</p>
        </div>
        <div className="z-10 text-sm text-white/60">© {new Date().getFullYear()} GMBS — Tous droits réservés</div>
        <div className="absolute inset-0 opacity-20 pointer-events-none select-none">
          <Image src="/login-bg.jpg" alt="" fill priority sizes="100vw" style={{ objectFit: 'cover' }} />
        </div>
      </div>

      {/* Right login card */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-background">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>Identifiez-vous pour accéder à GMBS CRM</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1">
                <label className="text-sm">Email ou nom d’utilisateur</label>
                <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus required placeholder="ex: alice@gmbs.fr" />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Mot de passe</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>
            <div className="mt-4 text-xs text-muted-foreground">
              Besoin d’un accès ? Contactez l’administrateur.
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
              <Link href="#" className="hover:underline">Mot de passe oublié</Link>
              <Link href="/" className="hover:underline">Retour au site</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
