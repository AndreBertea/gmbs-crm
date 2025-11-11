"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import type { ReactElement } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/artisans/Avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
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
import { useArtisanViews } from "@/hooks/useArtisanViews"
import { ArtisanViewTabs } from "@/components/artisans/ArtisanViewTabs"
import type { Artisan as ApiArtisan } from "@/lib/supabase-api-v2"
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Mail, Phone, Building, MapPin, Wrench, X } from "lucide-react"
import Loader from "@/components/ui/Loader"

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
  photoProfilUrl?: string | null
  photoProfilMetadata?: {
    hash: string | null
    sizes: Record<string, string>
    mime_preferred: string
    baseUrl: string | null
  } | null
  artisanInitials?: string
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
  gestionnaire_id?: string | null
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
  const user = users.find((u) => u.id === artisan.gestionnaire_id)
  // Trouver le statut en utilisant l'ID du statut de l'artisan
  const artisanStatus = artisanStatuses.find((s) => s.id === artisan.statut_id)
  
  // Debug: vérifier si le statut est trouvé
  if (!artisanStatus && artisan.statut_id) {
    console.warn(`[mapArtisanToContact] Statut non trouvé pour artisan ${artisan.id}:`, {
      artisanStatutId: artisan.statut_id,
      availableStatusIds: artisanStatuses.map(s => s.id),
      availableStatusCodes: artisanStatuses.map(s => s.code),
    })
  }

  const zone = Array.isArray(raw.zones) && raw.zones.length > 0 ? raw.zones[0] : raw.zoneIntervention

  // Calculer les initiales du gestionnaire
  const gestionnaireInitials = user 
    ? ((user.firstname?.[0] || '') + (user.lastname?.[0] || '')).toUpperCase() || user.code_gestionnaire?.substring(0, 2).toUpperCase() || '??'
    : '—'

  // Récupérer les métadonnées de la photo_profil depuis l'artisan (déjà mappées par mapArtisanRecord)
  const photoProfilUrl = artisan.photoProfilBaseUrl || null
  const photoProfilMetadata = artisan.photoProfilMetadata || null

  // Calculer les initiales de l'artisan
  const artisanName = `${artisan.prenom || ""} ${artisan.nom || ""}`.trim() || "Artisan sans nom"
  const artisanInitials = artisanName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??"

  return {
    id: artisan.id,
    name: artisanName,
    email: artisan.email || "",
    phone: artisan.telephone || "",
    company: artisan.raison_sociale || "",
    position: Array.isArray(raw.metiers) ? raw.metiers.join(", ") : raw.metiers || "",
    status: (raw.statut_artisan ?? raw.status ?? "Disponible") as Contact["status"],
    avatar: photoProfilUrl || "/placeholder.svg",
    photoProfilUrl: photoProfilUrl,
    photoProfilMetadata: photoProfilMetadata,
    artisanInitials: artisanInitials,
    lastContact: raw.date_ajout || artisan.updated_at || "",
    createdAt: artisan.created_at || raw.date_ajout || "",
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
    gestionnaire_id: artisan.gestionnaire_id ?? null,
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
    refresh,
  } = useArtisans({
    limit: 10000, // Charger tous les artisans d'un coup
    autoLoad: true,
  })

  const {
    data: referenceData,
    loading: referenceLoading,
    error: referenceError,
  } = useReferenceData()

  const artisanModal = useArtisanModal()
  const { views, activeView, activeViewId, setActiveView, isReady } = useArtisanViews()

  const loading = artisansLoading || referenceLoading
  const error = artisansError || referenceError

  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [artisanStatuses, setArtisanStatuses] = useState<any[]>([])
  const [metierFilter, setMetierFilter] = useState<string>("all")
  const [loadingMore, setLoadingMore] = useState(false)

  // Appliquer les filtres depuis sessionStorage (pour les liens du dashboard)
  useEffect(() => {
    if (!isReady || artisanStatuses.length === 0) return
    
    const pendingFilterStr = sessionStorage.getItem('pending-artisan-filter')
    if (pendingFilterStr) {
      try {
        const pendingFilter = JSON.parse(pendingFilterStr)
        
        // Activer la vue spécifiée (ex: "ma-liste-artisans")
        if (pendingFilter.viewId && views.some(v => v.id === pendingFilter.viewId)) {
          setActiveView(pendingFilter.viewId)
        }
        
        // Activer le filtre de statut spécifié (ex: "Potentiel")
        if (pendingFilter.statusFilter) {
          // Trouver le statut correspondant dans la liste des statuts d'artisans
          const statusLabel = pendingFilter.statusFilter
          // Vérifier si le statut existe dans la liste des statuts disponibles
          const statusExists = artisanStatuses.some(s => s.label === statusLabel)
          if (statusExists) {
            setSelectedStatuses([statusLabel])
          }
        }
        
        // Nettoyer sessionStorage après avoir appliqué les filtres
        sessionStorage.removeItem('pending-artisan-filter')
      } catch (error) {
        console.error("Erreur lors de l'application du filtre depuis sessionStorage:", error)
        sessionStorage.removeItem('pending-artisan-filter')
      }
    }
  }, [isReady, views, setActiveView, artisanStatuses])

  useEffect(() => {
    if (!referenceData) return
    const statuses = referenceData.artisanStatuses || []
    setArtisanStatuses(statuses)
    
    // Trier d'abord les artisans par created_at (du plus récent au plus ancien)
    const sortedArtisans = [...artisans].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      // Si les dates sont invalides, retourner 0 pour garder l'ordre original
      if (isNaN(dateA) && isNaN(dateB)) return 0
      if (isNaN(dateA)) return 1 // Les dates invalides vont à la fin
      if (isNaN(dateB)) return -1
      return dateB - dateA // Ordre décroissant (plus récent en premier)
    })
    
    const mapped = sortedArtisans.map((artisan) => 
      mapArtisanToContact(
        artisan, 
        referenceData.users as ReferenceUser[], 
        statuses
      )
    )
    setContacts(mapped)
  }, [artisans, referenceData])

  useEffect(() => {
    const handleArtisanUpdated = () => {
      void refresh()
    }

    const handleInterventionUpdated = () => {
      // Rafraîchir les artisans quand une intervention est mise à jour
      // car cela peut affecter le statut de l'artisan
      void refresh()
    }

    window.addEventListener("artisan-updated", handleArtisanUpdated)
    window.addEventListener("intervention-updated", handleInterventionUpdated)
    return () => {
      window.removeEventListener("artisan-updated", handleArtisanUpdated)
      window.removeEventListener("intervention-updated", handleInterventionUpdated)
    }
  }, [refresh])

  // Appliquer les filtres de la vue active
  const viewFilteredContacts = useMemo(() => {
    if (!isReady || !activeView) return contacts
    
    return contacts.filter((contact) => {
      return activeView.filters.every((filter) => {
        if (filter.property === "gestionnaire_id") {
          if (filter.operator === "eq") {
            return contact.gestionnaire_id === filter.value
          }
        }
        return true
      })
    })
  }, [contacts, activeView, isReady])

  const filteredContacts = viewFilteredContacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(contact.statutArtisan || "")
    const matchesMetier = metierFilter === "all" || contact.metiers?.some((m) => m === metierFilter)
    return matchesSearch && matchesStatus && matchesMetier
  })

  // Calculer les compteurs par vue
  const viewCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    views.forEach((view) => {
      const filtered = contacts.filter((contact) => {
        return view.filters.every((filter) => {
          if (filter.property === "gestionnaire_id") {
            if (filter.operator === "eq") {
              return contact.gestionnaire_id === filter.value
            }
          }
          return true
        })
      })
      counts[view.id] = filtered.length
    })
    return counts
  }, [contacts, views])

  const handleEditContact = useCallback((contact: Contact) => {
    artisanModal.open(contact.id)
  }, [artisanModal])

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
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div style={{ transform: 'scale(1.25)' }}>
          <Loader />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 64px - 2px)', maxHeight: 'calc(100vh - 64px - 2px)', boxSizing: 'border-box' }}>
      <div className="flex-1 space-y-4 p-6 overflow-hidden flex flex-col min-h-0" style={{ maxHeight: '100%', boxSizing: 'border-box' }}>
        {/* Boutons de vue */}
        <Tabs defaultValue="list" className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {isReady && (
            <div className="flex items-center justify-between gap-4 mb-4">
              <ArtisanViewTabs
                views={views}
                activeViewId={activeViewId}
                onSelect={setActiveView}
                artisanCounts={viewCounts}
              />
              <TabsList className="flex-shrink-0">
                <TabsTrigger value="list">Vue Liste</TabsTrigger>
                <TabsTrigger value="grid">Vue Grille</TabsTrigger>
              </TabsList>
            </div>
          )}

          <Card className="border-2 shadow-sm">
            <CardContent className="p-4">
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
                          onClick={() => setSelectedStatuses([])}
                          className={`
                            flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-all duration-200 hover:shadow-sm
                            ${
                              selectedStatuses.length === 0
                                ? "border-gray-500 bg-gray-500 text-white"
                                : "border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50"
                            }
                          `}
                        >
                          <span>Tous ({getContactCountByStatus("all")})</span>
                        </button>

                        {artisanStatuses.filter(s => s.is_active !== false).map((status) => {
                          const isSelected = selectedStatuses.includes(status.label)
                          const statusColor = status.color || "#666"
                          
                          return (
                            <button
                              key={status.id}
                              onClick={() => {
                                setSelectedStatuses((prev) => {
                                  if (prev.includes(status.label)) {
                                    return prev.filter((s) => s !== status.label)
                                  } else {
                                    return [...prev, status.label]
                                  }
                                })
                              }}
                              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-all duration-200 hover:shadow-sm ${
                                isSelected
                                  ? ""
                                  : "border-border bg-transparent hover:bg-muted/50"
                              }`}
                              style={isSelected ? {
                                backgroundColor: `${statusColor}15`,
                                borderColor: statusColor,
                                color: statusColor
                              } : {}}
                            >
                              {status.label} ({getContactCountByStatus(status.label)})
                            </button>
                          )
                        })}
                        
                        {selectedStatuses.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setSelectedStatuses([])}
                            title="Réinitialiser les filtres"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
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

          <TabsContent value="grid" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map((contact) => (
                <Card key={contact.id} className="border-2 transition-all hover:shadow-lg hover:border-primary/30">
                  <CardHeader className="pb-3 bg-muted/10 border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar
                          photoProfilMetadata={contact.photoProfilMetadata}
                          initials={contact.artisanInitials || "??"}
                          name={contact.name}
                          size={40}
                        />
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{contact.name}</CardTitle>
                          <CardDescription>{contact.company}</CardDescription>
                        </div>
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

          <TabsContent value="list" className="flex flex-col flex-1 min-h-0">
            <Card className="border-2 shadow-sm flex flex-col flex-1 min-h-0">
              <CardContent className="p-0 flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="min-w-full divide-y-2 divide-border">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-muted/50 border-b-2">
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
                              <Avatar 
                                photoProfilMetadata={contact.photoProfilMetadata}
                                initials={contact.artisanInitials || "??"}
                                name={contact.name}
                                size={40}
                                priority={index < 3}
                              />
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
