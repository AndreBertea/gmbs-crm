"use client"

import React, { useState, useCallback, useEffect } from "react"
import type { ReactElement } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useArtisans } from "@/hooks/useArtisans"
import { useReferenceData } from "@/hooks/useReferenceData"
import { useArtisanModal } from "@/hooks/useArtisanModal"
import type { Artisan as ApiArtisan } from "@/lib/supabase-api-v2"
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Mail, Phone, Building, MapPin, Wrench } from "lucide-react"

// Helper pour convertir hex en rgba
function hexToRgba(hex: string, alpha: number): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Style pour les badges avec couleur personnalisée
function computeBadgeStyle(color?: string | null) {
  if (!color) {
    return {
      backgroundColor: "#f1f5f9",
      color: "#0f172a",
      borderColor: "#e2e8f0",
    }
  }
  return {
    backgroundColor: hexToRgba(color, 0.28) ?? "#f1f5f9",
    color,
    borderColor: color,
  }
}

// Composant badge rond avec initiales (comme dans le profil)
function UserBadge({ initials, color, name }: { initials: string; color?: string | null; name?: string }) {
  const bgColor = color || '#6b7280'
  const borderColor = color ? hexToRgba(color, 0.3) || '#e5e7eb' : '#e5e7eb'
  const textColor = '#ffffff'
  const displayInitials = initials || '??'

  return (
    <div 
      className="relative h-8 w-8 rounded-full grid place-items-center font-semibold text-xs uppercase select-none border-2"
      style={{ 
        background: bgColor, 
        borderColor: borderColor,
        color: textColor 
      }}
      title={name || 'Non assigné'}
    >
      <span className="leading-none">{displayInitials}</span>
    </div>
  )
}

type Contact = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  position: string
  status: "Disponible" | "En_intervention" | "Indisponible" | "En_congé" | "Inactif"
  avatar: string
  lastContact: string
  createdAt: string
  notes: string
  siret?: string
  statutJuridique?: string
  statutArtisan?: string
  statutArtisanColor?: string | null
  zoneIntervention?: string | number
  adresse?: string
  adresseIntervention?: string
  metiers?: string[]
  statutDossier?: string
  statutInactif?: boolean
  attribueA?: string
  gestionnaireInitials?: string
  gestionnaireColor?: string | null
}

type ReferenceUser = {
  id: string
  firstname: string | null
  lastname: string | null
  code_gestionnaire: string | null
  color?: string | null
}

const statusConfig = {
  Disponible: {
    label: "Disponible",
    color: "bg-green-100 text-green-700 border-green-200",
    activeColor: "bg-green-500 text-white",
  },
  En_intervention: {
    label: "En intervention",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    activeColor: "bg-yellow-500 text-white",
  },
  Indisponible: {
    label: "Indisponible",
    color: "bg-red-100 text-red-700 border-red-200",
    activeColor: "bg-red-500 text-white",
  },
  En_congé: {
    label: "En congé",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    activeColor: "bg-blue-500 text-white",
  },
  Inactif: {
    label: "Inactif",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    activeColor: "bg-gray-500 text-white",
  },
} as const

const dossierStatusConfig = {
  Actif: {
    label: "Actif",
    color: "bg-green-100 text-green-800",
  },
  En_cours: {
    label: "En cours",
    color: "bg-yellow-100 text-yellow-800",
  },
  Archivé: {
    label: "Archivé",
    color: "bg-gray-100 text-gray-800",
  },
  Suspendu: {
    label: "Suspendu",
    color: "bg-red-100 text-red-800",
  },
} as const

const mapArtisanToContact = (artisan: ApiArtisan, users: ReferenceUser[], artisanStatuses: any[]): Contact => {
  const raw = artisan as any
  const user = users.find((u) => u.id === (raw.gestionnaire_id ?? raw.attribueA))
  const artisanStatus = artisanStatuses.find((s) => s.id === artisan.statut_id)

  const zone = Array.isArray(raw.zones) && raw.zones.length > 0 ? raw.zones[0] : raw.zoneIntervention

  // Calculer les initiales du gestionnaire
  const gestionnaireInitials = user 
    ? ((user.firstname?.[0] || '') + (user.lastname?.[0] || '')).toUpperCase() || user.code_gestionnaire?.substring(0, 2).toUpperCase() || '??'
    : '—'

  return {
    id: artisan.id,
    name: `${artisan.prenom || ""} ${artisan.nom || ""}`.trim() || "Artisan sans nom",
    email: artisan.email || "",
    phone: artisan.telephone || "",
    company: artisan.raison_sociale || "",
    position: Array.isArray(raw.metiers) ? raw.metiers.join(", ") : raw.metiers || "",
    status: (raw.statut_artisan ?? raw.status ?? "Disponible") as Contact["status"],
    avatar: "/placeholder.svg",
    lastContact: raw.date_ajout || artisan.updated_at || "",
    createdAt: raw.date_ajout || artisan.created_at || "",
    notes: raw.commentaire || "",
    siret: artisan.siret || "",
    statutJuridique: artisan.statut_juridique || "",
    statutArtisan: artisanStatus?.label || "",
    statutArtisanColor: artisanStatus?.color || null,
    zoneIntervention: zone ?? "",
    adresse: `${artisan.adresse_siege_social || ""}, ${artisan.code_postal_siege_social || ""} ${artisan.ville_siege_social || ""}`.trim(),
    adresseIntervention: `${artisan.adresse_intervention || ""}, ${artisan.code_postal_intervention || ""} ${artisan.ville_intervention || ""}`.trim(),
    metiers: Array.isArray(raw.metiers) ? raw.metiers : raw.metiers ? [raw.metiers] : [],
    statutDossier: raw.statut_dossier || raw.statut_artisan || "",
    statutInactif: Boolean(raw.statut_inactif),
    attribueA: user ? `${user.firstname || ""} ${user.lastname || ""}`.trim() || user.code_gestionnaire || "Non assigné" : "Non assigné",
    gestionnaireInitials,
    gestionnaireColor: user?.color || null,
  }
}

const getStatusColor = (status: Contact["status"]) => {
  const colors: Record<string, string> = {
    Disponible: "bg-green-100 text-green-800",
    En_intervention: "bg-yellow-100 text-yellow-800",
    Indisponible: "bg-red-100 text-red-800",
    En_congé: "bg-blue-100 text-blue-800",
    Inactif: "bg-gray-100 text-gray-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

const getDossierStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    Actif: "bg-green-100 text-green-800",
    En_cours: "bg-yellow-100 text-yellow-800",
    Archivé: "bg-gray-100 text-gray-800",
    Suspendu: "bg-red-100 text-red-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export default function ArtisansPage(): ReactElement {
  const {
    artisans,
    loading: artisansLoading,
    error: artisansError,
    hasMore,
    totalCount,
    loadMore,
  } = useArtisans({
    limit: 100,
    autoLoad: true,
  })

  const {
    data: referenceData,
    loading: referenceLoading,
    error: referenceError,
  } = useReferenceData()

  const artisanModal = useArtisanModal()

  const loading = artisansLoading || referenceLoading
  const error = artisansError || referenceError

  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [artisanStatuses, setArtisanStatuses] = useState<any[]>([])
  const [metierFilter, setMetierFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (!referenceData) return
    const statuses = referenceData.artisanStatuses || []
    setArtisanStatuses(statuses)
    const mapped = artisans.map((artisan) => 
      mapArtisanToContact(
        artisan, 
        referenceData.users as ReferenceUser[], 
        statuses
      )
    )
    setContacts(mapped)
  }, [artisans, referenceData])

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || contact.statutArtisan === statusFilter
    const matchesMetier = metierFilter === "all" || contact.metiers?.some((m) => m === metierFilter)
    return matchesSearch && matchesStatus && matchesMetier
  })

  const handleAddContact = useCallback(
    (contactData: Partial<Contact>) => {
      const newContact: Contact = {
        id: `ARTISAN-${String(contacts.length + 1).padStart(3, "0")}`,
        name: contactData.name || "",
        email: contactData.email || "",
        phone: contactData.phone || "",
        company: contactData.company || "",
        position: contactData.position || "",
        status: (contactData.status || "Disponible") as Contact["status"],
        avatar: "/placeholder.svg",
        lastContact: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString().split("T")[0],
        notes: contactData.notes || "",
        siret: contactData.siret || "",
        statutJuridique: contactData.statutJuridique || "Auto-entrepreneur",
        zoneIntervention: contactData.zoneIntervention || 75,
        adresse: contactData.adresse || "",
        adresseIntervention: contactData.adresseIntervention || "",
        metiers: contactData.metiers || ["Dépannage"],
        statutDossier: contactData.statutDossier || "Actif",
        statutInactif: contactData.statutInactif || false,
        attribueA: contactData.attribueA || "Non assigné",
      }
      setContacts((prev) => [...prev, newContact])
      setIsDialogOpen(false)
    },
    [contacts.length],
  )

  const handleEditContact = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setIsDialogOpen(true)
  }, [])

  const handleViewDetails = useCallback((contact: Contact) => {
    artisanModal.open(contact.id)
  }, [artisanModal])

  const handleDeleteContact = useCallback((contact: Contact) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'artisan "${contact.name}" ?`)) {
      setContacts((prev) => prev.filter((c) => c.id !== contact.id))
    }
  }, [])

  const handleSendEmail = useCallback((contact: Contact) => {
    console.log("Send email to:", contact.email)
  }, [])

  const handleCall = useCallback((contact: Contact) => {
    console.log("Call:", contact.phone)
  }, [])

  const getContactCountByStatus = useCallback(
    (status: string) => {
      if (status === "all") {
        return contacts.length
      }
      return contacts.filter((contact) => contact.statutArtisan === status).length
    },
    [contacts],
  )

  const getContactCountByMetier = useCallback(
    (metier: string) => {
      if (metier === "all") {
        return contacts.length
      }
      return contacts.filter((contact) => contact.metiers?.some((m) => m === metier)).length
    },
    [contacts],
  )

  const allMetiers = Array.from(new Set(contacts.flatMap((c) => c.metiers || [])))

  const handleLoadMoreArtisans = useCallback(async () => {
    if (loadingMore || !hasMore) return
    try {
      setLoadingMore(true)
      await loadMore()
    } catch (err) {
      console.error("Erreur lors du chargement de plus d'artisans:", err)
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadMore, loadingMore])

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 p-6">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-red-600">Erreur de chargement</h2>
            <p className="mb-4 text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
            <p className="text-gray-600">Chargement des artisans...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Artisans</h1>
            <p className="text-muted-foreground">Gérez vos artisans partenaires</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingContact(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel Artisan
                </Button>
              </DialogTrigger>
              <ArtisanDialog
                contact={editingContact}
                onSave={(data) => {
                  if (editingContact) {
                    handleEditContact({ ...editingContact, ...data })
                  } else {
                    handleAddContact(data)
                  }
                  setIsDialogOpen(false)
                  setEditingContact(null)
                }}
                onCancel={() => {
                  setIsDialogOpen(false)
                  setEditingContact(null)
                }}
              />
            </Dialog>
          </div>
        </div>

        <Card className="border-2 shadow-sm">
          <CardContent className="p-4 bg-slate-50 dark:bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                    <Input
                      placeholder="Rechercher artisans..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-muted-foreground">Statut:</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setStatusFilter("all")}
                        className={`
                          flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-all duration-200 hover:shadow-sm
                          ${
                            statusFilter === "all"
                              ? "border-gray-500 bg-gray-500 text-white"
                              : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }
                        `}
                      >
                        <span>Tous ({getContactCountByStatus("all")})</span>
                      </button>

                      {artisanStatuses.filter(s => s.is_active !== false).map((status) => {
                        const isActive = statusFilter === status.label
                        const style = isActive && status.color 
                          ? { backgroundColor: status.color, color: '#fff', borderColor: status.color }
                          : status.color 
                          ? { ...computeBadgeStyle(status.color), border: `1px solid ${status.color}40` }
                          : {}
                        
                        return (
                          <button
                            key={status.id}
                            onClick={() => setStatusFilter(status.label)}
                            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-all duration-200 hover:shadow-sm"
                            style={style}
                          >
                            {status.label} ({getContactCountByStatus(status.label)})
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-muted-foreground">Métier:</span>
                    <Select value={metierFilter} onValueChange={setMetierFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrer par métier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les métiers ({getContactCountByMetier("all")})</SelectItem>
                        {allMetiers.map((metier) => (
                          <SelectItem key={metier} value={metier}>
                            {metier} ({getContactCountByMetier(metier)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Vue Liste</TabsTrigger>
            <TabsTrigger value="grid">Vue Grille</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map((contact) => (
                <Card key={contact.id} className="border-2 transition-all hover:shadow-lg hover:border-primary/30">
                  <CardHeader className="pb-3 bg-muted/10 border-b">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{contact.name}</CardTitle>
                        <CardDescription>{contact.company}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(contact)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir Détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(contact)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Envoyer Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCall(contact)}>
                            <Phone className="mr-2 h-4 w-4" />
                            Appeler
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteContact(contact)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b">
                      <Badge className={getStatusColor(contact.status)}>{contact.status}</Badge>
                      <Badge variant="outline" className={getDossierStatusColor(contact.statutDossier || "" )}>
                        {contact.statutDossier}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-3 w-3" />
                        <span className="font-medium">Métiers:</span>
                        <span>{contact.metiers?.join(", ") || "Non renseigné"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="h-3 w-3" />
                        <span className="font-medium">Entreprise:</span>
                        <span>{contact.company}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>{contact.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{contact.adresseIntervention || contact.adresse}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleLoadMoreArtisans}
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full max-w-xs"
                >
                  {loadingMore ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>
                      Chargement...
                    </>
                  ) : (
                    `Charger plus d'artisans (${contacts.length}${totalCount ? ` / ${totalCount}` : ""})`
                  )}
                </Button>
              </div>
            )}

            {!hasMore && contacts.length > 0 && (
              <div className="py-4 text-center text-muted-foreground">
                <p>Tous les artisans ont été chargés ({totalCount || contacts.length} artisans)</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <Card className="border-2 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y-2 divide-border">
                    <thead className="bg-slate-100 dark:bg-muted/50 border-b-2">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">Artisan</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">Entreprise</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">Gest.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">Adresse siège</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {filteredContacts.map((contact, index) => (
                        <tr key={contact.id} className={`hover:bg-slate-100/60 dark:hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-background' : 'bg-slate-50 dark:bg-muted/10'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={contact.avatar} alt={contact.name} />
                                <AvatarFallback>
                                  {contact.name
                                    .split(" ")
                                    .map((part) => part.charAt(0))
                                    .join("" )
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{contact.name}</span>
                                    <span className="text-sm text-muted-foreground">Zone {contact.zoneIntervention ?? "—"}</span>
                                  </div>
                                  <div className="flex items-center">
                                    {contact.statutArtisan && contact.statutArtisanColor && (
                                      <Badge 
                                        variant="outline" 
                                        className="border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                                        style={{
                                          backgroundColor: hexToRgba(contact.statutArtisanColor, 0.15) || contact.statutArtisanColor + '20',
                                          color: contact.statutArtisanColor,
                                          borderColor: contact.statutArtisanColor,
                                        }}
                                      >
                                        {contact.statutArtisan}
                                      </Badge>
                                    )}
                                    {contact.statutArtisan && !contact.statutArtisanColor && (
                                      <Badge 
                                        variant="outline" 
                                        className="border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-700 border-gray-300"
                                      >
                                        {contact.statutArtisan}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {contact.company}
                                {contact.statutJuridique && (
                                  <span className="text-muted-foreground"> / {contact.statutJuridique}</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{contact.position}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span>{contact.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{contact.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              <UserBadge 
                                initials={contact.gestionnaireInitials || '—'}
                                color={contact.gestionnaireColor}
                                name={contact.attribueA}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {contact.adresse || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleViewDetails(contact)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditContact(contact)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDeleteContact(contact)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function ArtisanDialog({
  contact,
  onSave,
  onCancel,
}: {
  contact: Contact | null
  onSave: (data: Partial<Contact>) => void
  onCancel: () => void
}): ReactElement {
  const [formData, setFormData] = useState({
    name: contact?.name || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    company: contact?.company || "",
    position: contact?.position || "",
    status: contact?.status || "Disponible",
    notes: contact?.notes || "",
    siret: contact?.siret || "",
    statutJuridique: contact?.statutJuridique || "Auto-entrepreneur",
    zoneIntervention: contact?.zoneIntervention || 75,
    adresse: contact?.adresse || "",
    adresseIntervention: contact?.adresseIntervention || "",
    metiers: contact?.metiers || ["Dépannage"],
    statutDossier: contact?.statutDossier || "Actif",
    statutInactif: contact?.statutInactif || false,
    attribueA: contact?.attribueA || "Non assigné",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{contact ? "Modifier l'Artisan" : "Nouvel Artisan"}</DialogTitle>
        <DialogDescription>
          {contact ? "Modifiez les informations de l'artisan." : "Créez un nouvel artisan."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Raison sociale</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input
              id="siret"
              value={formData.siret}
              onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statutJuridique">Statut juridique</Label>
            <Select
              value={formData.statutJuridique}
              onValueChange={(value) => setFormData({ ...formData, statutJuridique: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Auto-entrepreneur">Auto-entrepreneur</SelectItem>
                <SelectItem value="SARL">SARL</SelectItem>
                <SelectItem value="EURL">EURL</SelectItem>
                <SelectItem value="SAS">SAS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as Contact["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Disponible">Disponible</SelectItem>
                <SelectItem value="En_intervention">En intervention</SelectItem>
                <SelectItem value="Indisponible">Indisponible</SelectItem>
                <SelectItem value="En_congé">En congé</SelectItem>
                <SelectItem value="Inactif">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zoneIntervention">Zone d'intervention</Label>
            <Input
              id="zoneIntervention"
              value={formData.zoneIntervention}
              onChange={(e) => setFormData({ ...formData, zoneIntervention: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Métiers</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="Séparés par des virgules"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse siège social</Label>
          <Input
            id="adresse"
            value={formData.adresse}
            onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Commentaires</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit">{contact ? "Modifier" : "Créer"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
