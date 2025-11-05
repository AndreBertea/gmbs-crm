"use client"

import Topbar from "@/components/layout/topbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import InterventionCard, { INTERVENTION_STATUS_CONFIG } from "@/features/interventions/components/InterventionCard"
import { InterventionDetailCard } from "@/features/interventions/components/InterventionDetailCard"
import { useInterventions } from "@/hooks/useInterventions"
import type { Intervention } from "@/lib/supabase-api-v2"
import { Download, Filter, Info, Search, Settings } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"

type SortField = "cree" | "echeance" | "marge"
type SortDir = "asc" | "desc"

type DateRange = {
  from: string | null
  to: string | null
}

const DEFAULT_STATUSES = ["Demandé", "Devis_Envoyé", "Accepté", "En_cours"]

export default function InterventionsFullPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Utiliser le hook personnalisé
  const { 
    interventions, 
    setInterventions,
    loading, 
    error, 
    hasMore, 
    loadMore, 
    refresh, 
    setFilters 
  } = useInterventions({
    limit: 100,
    autoLoad: true
  })
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null)

  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [pinnedStatuses, setPinnedStatuses] = useState<string[]>(DEFAULT_STATUSES)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null })
  const [selectedArtisanStatuses, setSelectedArtisanStatuses] = useState<string[]>([])
  const [selectedDossierStatuses, setSelectedDossierStatuses] = useState<string[]>([])
  const [pinnedFilters, setPinnedFilters] = useState<{ artisanStatus: boolean; dossierStatus: boolean }>({
    artisanStatus: false,
    dossierStatus: false,
  })
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)

  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState<number>(-1)
  const [selectedActionIndex, setSelectedActionIndex] = useState<number>(-1)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(-1)
  const [isKeyboardMode, setIsKeyboardMode] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [statusColors, setStatusColors] = useState<Record<string, string>>(() =>
    INTERVENTION_STATUS_CONFIG.reduce<Record<string, string>>((acc, status) => {
      acc[status.key] = status.defaultColor
      return acc
    }, {}),
  )

  const [sortField, setSortField] = useState<SortField>("cree")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const [scrollDirection, setScrollDirection] = useState<"left" | "right" | null>(null)
  const [scrollAccumulator, setScrollAccumulator] = useState(0)
  const scrollThreshold = 100
  const listRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto"
    }
  }, [])

  // Chargement initial supprimé - géré par le hook

  useEffect(() => {
    if (!isKeyboardMode) return
    const handleMouseReset = () => {
      setIsKeyboardMode(false)
      setKeyboardSelectedIndex(-1)
      setSelectedActionIndex(-1)
      setSelectedCardIndex(-1)
      document.body.style.cursor = "auto"
    }
    document.addEventListener("mousemove", handleMouseReset)
    document.addEventListener("mousedown", handleMouseReset)
    return () => {
      document.removeEventListener("mousemove", handleMouseReset)
      document.removeEventListener("mousedown", handleMouseReset)
    }
  }, [isKeyboardMode])

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>()
    interventions.forEach((item) => item.statut && set.add(item.statut))
    return Array.from(set)
  }, [interventions])

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>()
    interventions.forEach((item) => {
      const code = item.assignedUserCode ?? item.attribueA
      if (code) {
        set.add(code)
      }
    })
    return Array.from(set)
  }, [interventions])

  const uniqueArtisanStatuses = useMemo(() => {
    const set = new Set<string>()
    interventions.forEach((item) => item.sousStatutText && set.add(item.sousStatutText))
    return Array.from(set)
  }, [interventions])

  const uniqueDossierStatuses = useMemo(() => {
    const set = new Set<string>()
    interventions.forEach((item) => item.sousStatutTextColor && set.add(item.sousStatutTextColor))
    return Array.from(set)
  }, [interventions])

  const additionalStatuses = uniqueStatuses.filter((status) => !DEFAULT_STATUSES.includes(status))
  const displayedStatuses = useMemo(
    () => Array.from(new Set([...DEFAULT_STATUSES, ...pinnedStatuses])),
    [pinnedStatuses],
  )

  const quickPinnedStatuses = useMemo(
    () => Array.from(new Set(pinnedStatuses)),
    [pinnedStatuses],
  )

  const applyInterventionUpdate = useCallback((id: string, updates: Partial<Intervention>) => {
    setInterventions((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
    setSelectedIntervention((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev))
  }, [])

  const handleTogglePinnedStatus = useCallback((statusKey: string) => {
    setPinnedStatuses((prev) => {
      const exists = prev.includes(statusKey)
      if (exists) {
        return prev.filter((key) => key !== statusKey)
      }
      return [...prev, statusKey]
    })
  }, [])

  const handleStatusColorChange = useCallback((statusKey: string, color: string) => {
    setStatusColors((prev) => ({ ...prev, [statusKey]: color }))
  }, [])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  useEffect(() => {
    if (!expandedId) return
    const node = cardRefs.current[expandedId]
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" })
    }
  }, [expandedId])

  const filtered = useMemo(() => {
    return interventions.filter((item) => {
      if (selectedUser) {
        const code = item.assignedUserCode ?? item.attribueA
        if (code !== selectedUser) return false
      }
      if (selectedStatus && item.statut !== selectedStatus) return false
      if (selectedArtisanStatuses.length > 0) {
        if (!item.sousStatutText || !selectedArtisanStatuses.includes(item.sousStatutText)) return false
      }
      if (selectedDossierStatuses.length > 0) {
        if (!item.sousStatutTextColor || !selectedDossierStatuses.includes(item.sousStatutTextColor)) return false
      }
      if (dateRange.from) {
        const created = new Date(item.date || item.dateIntervention || "").getTime()
        if (!Number.isFinite(created) || created < new Date(dateRange.from).getTime()) return false
      }
      if (dateRange.to) {
        const created = new Date(item.date || item.dateIntervention || "").getTime()
        if (!Number.isFinite(created) || created > new Date(dateRange.to).getTime()) return false
      }
      return true
    })
  }, [dateRange.from, dateRange.to, interventions, selectedArtisanStatuses, selectedDossierStatuses, selectedStatus, selectedUser])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let av = 0
      let bv = 0
      switch (sortField) {
        case "cree":
          av = new Date(a.date || a.dateIntervention || 0).getTime() || 0
          bv = new Date(b.date || b.dateIntervention || 0).getTime() || 0
          break
        case "echeance":
          av = new Date(a.dateIntervention || a.date || 0).getTime() || 0
          bv = new Date(b.dateIntervention || b.date || 0).getTime() || 0
          break
        case "marge":
          av = a.marge ?? 0
          bv = b.marge ?? 0
          break
      }
      return sortDir === "asc" ? av - bv : bv - av
    })
    return arr
  }, [filtered, sortDir, sortField])

  const searched = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return sorted
    return sorted.filter((item) => {
      return (
        (item.contexteIntervention || "").toLowerCase().includes(term) ||
        (item.nomClient || "").toLowerCase().includes(term) ||
        (item.prenomClient || "").toLowerCase().includes(term)
      )
    })
  }, [search, sorted])

  const getCountByStatus = useCallback(
    (status: string) => {
      if (status === "") return interventions.length
      return interventions.filter((item) => item.statut === status).length
    },
    [interventions],
  )

  const handleAddPinnedStatus = (status: string) => {
    handleTogglePinnedStatus(status)
  }

  const handleRemovePinnedStatus = (status: string) => {
    handleTogglePinnedStatus(status)
  }

  const handleWheel = (event: React.WheelEvent) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
    event.preventDefault()
    const delta = event.deltaX
    setScrollAccumulator((prev) => {
      const next = prev + delta
      if (Math.abs(next) >= scrollThreshold) {
        const statuses = ["", ...displayedStatuses]
        const currentIndex = statuses.indexOf(selectedStatus)
        let nextIndex = currentIndex
        if (next > 0) {
          nextIndex = currentIndex < statuses.length - 1 ? currentIndex + 1 : 0
          setScrollDirection("right")
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : statuses.length - 1
          setScrollDirection("left")
        }
        setSelectedStatus(statuses[nextIndex])
        setTimeout(() => setScrollDirection(null), 250)
        return 0
      }
      return next
    })
  }

  useEffect(() => {
    if (Math.abs(scrollAccumulator) === 0) return
    const timeout = setTimeout(() => setScrollAccumulator(0), 1000)
    return () => clearTimeout(timeout)
  }, [scrollAccumulator])

  const onSendEmail = useCallback((item: Intervention) => {
    console.log("TODO: send email", item.id)
  }, [])

  const onCall = useCallback((item: Intervention) => {
    console.log("TODO: call", item.id)
  }, [])

  const onAddDocument = useCallback((item: Intervention) => {
    console.log("TODO: add document", item.id)
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      // Don't handle keyboard events if a modal is open
      const hasOpenModal = document.querySelector('[role="dialog"], [role="alertdialog"]')
      if (hasOpenModal) return
      
      if (event.key === "Escape") {
        setIsKeyboardMode(false)
        document.body.style.cursor = "auto"
        setKeyboardSelectedIndex(-1)
        setSelectedActionIndex(-1)
        setSelectedCardIndex(-1)
        setExpandedId(null)
        return
      }

      if (!searched.length) return

      const activateKeyboardMode = () => {
        setIsKeyboardMode(true)
        document.body.style.cursor = "none"
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        activateKeyboardMode()
        if (keyboardSelectedIndex >= 0 && selectedActionIndex === 2 && selectedCardIndex !== -1) {
          setSelectedCardIndex((prev) => (prev > 0 ? prev - 1 : 2))
          return
        }
        if (keyboardSelectedIndex >= 0 && selectedActionIndex === 2 && selectedCardIndex === -1) {
          setSelectedCardIndex(0)
          return
        }
        setKeyboardSelectedIndex((prev) => (prev > 0 ? prev - 1 : searched.length - 1))
        setSelectedActionIndex(-1)
        setSelectedCardIndex(-1)
        return
      }

      if (event.key === "ArrowDown") {
        event.preventDefault()
        activateKeyboardMode()
        if (keyboardSelectedIndex >= 0 && selectedActionIndex === 2 && selectedCardIndex !== -1) {
          setSelectedCardIndex((prev) => (prev < 2 ? prev + 1 : 0))
          return
        }
        if (keyboardSelectedIndex >= 0 && selectedActionIndex === 2 && selectedCardIndex === -1) {
          setSelectedCardIndex(0)
          return
        }
        setKeyboardSelectedIndex((prev) => (prev < searched.length - 1 ? prev + 1 : 0))
        setSelectedActionIndex(-1)
        setSelectedCardIndex(-1)
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        activateKeyboardMode()
        if (keyboardSelectedIndex >= 0 && selectedActionIndex === 2 && selectedCardIndex >= 0) {
          setSelectedCardIndex((prev) => (prev > 0 ? prev - 1 : 2))
          return
        }
        if (keyboardSelectedIndex >= 0) {
          setSelectedActionIndex((prev) => (prev > 0 ? prev - 1 : 2))
          if (selectedActionIndex !== 2) setSelectedCardIndex(-1)
        } else {
          const statuses = ["", ...displayedStatuses]
          const currentIndex = statuses.indexOf(selectedStatus)
          setSelectedStatus(currentIndex > 0 ? statuses[currentIndex - 1] : statuses[statuses.length - 1])
        }
        return
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        activateKeyboardMode()
        if (keyboardSelectedIndex >= 0 && selectedActionIndex === 2 && selectedCardIndex >= 0) {
          setSelectedCardIndex((prev) => (prev < 2 ? prev + 1 : 0))
          return
        }
        if (keyboardSelectedIndex >= 0) {
          setSelectedActionIndex((prev) => (prev < 2 ? prev + 1 : 0))
          if (selectedActionIndex !== 2) setSelectedCardIndex(-1)
        } else {
          const statuses = ["", ...displayedStatuses]
          const currentIndex = statuses.indexOf(selectedStatus)
          setSelectedStatus(currentIndex < statuses.length - 1 ? statuses[currentIndex + 1] : statuses[0])
        }
        return
      }

      if (event.key === "Enter") {
        activateKeyboardMode()
        if (keyboardSelectedIndex >= 0 && selectedActionIndex === -1) {
          event.preventDefault()
          const card = searched[keyboardSelectedIndex]
          setSelectedIntervention(card)
          const params = new URLSearchParams(searchParams?.toString())
          params.set("selected", card.id)
          router.replace(`/interventions?${params.toString()}`)
          return
        }
        if (keyboardSelectedIndex >= 0 && selectedActionIndex >= 0) {
          event.preventDefault()
          const card = searched[keyboardSelectedIndex]
          if (selectedActionIndex === 0) onSendEmail(card)
          if (selectedActionIndex === 1) onCall(card)
          if (selectedActionIndex === 2) onAddDocument(card)
        }
        return
      }

      if (event.key === " ") {
        if (keyboardSelectedIndex >= 0 && keyboardSelectedIndex < searched.length) {
          event.preventDefault()
          activateKeyboardMode()
          const card = searched[keyboardSelectedIndex]
          handleToggleExpand(card.id)
        }
        return
      }

      if (event.key.toLowerCase() === "tab") {
        if (keyboardSelectedIndex >= 0) {
          event.preventDefault()
          activateKeyboardMode()
          const card = searched[keyboardSelectedIndex]
          const params = new URLSearchParams(searchParams?.toString())
          params.set("selected", card.id)
          router.replace(`/interventions?${params.toString()}`)
          setSelectedIntervention(card)
        }
        return
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [
    displayedStatuses,
    handleToggleExpand,
    onAddDocument,
    onCall,
    onSendEmail,
    router,
    searchParams,
    searched,
    selectedActionIndex,
    selectedCardIndex,
    selectedStatus,
    keyboardSelectedIndex,
  ])

  useEffect(() => {
    if (keyboardSelectedIndex >= searched.length) {
      setKeyboardSelectedIndex(searched.length ? searched.length - 1 : -1)
    }
  }, [searched, keyboardSelectedIndex])

  const handleStatusChange = useCallback(
    (item: Intervention, status: string) => {
      applyInterventionUpdate(item.id, { statut: status })
    },
    [applyInterventionUpdate],
  )

  const handleCoutSSTChange = useCallback(
    (item: Intervention, value: number) => applyInterventionUpdate(item.id, { coutSST: value }),
    [applyInterventionUpdate],
  )

  const handleCoutMateriauxChange = useCallback(
    (item: Intervention, value: number) => applyInterventionUpdate(item.id, { coutMateriel: value }),
    [applyInterventionUpdate],
  )

  const handleCoutInterventionsChange = useCallback(
    (item: Intervention, value: number) => applyInterventionUpdate(item.id, { coutIntervention: value }),
    [applyInterventionUpdate],
  )

  const handleUserChange = useCallback(
    (item: Intervention, code: string) => applyInterventionUpdate(item.id, { attribueA: code }),
    [applyInterventionUpdate],
  )

  const handleResetFilters = () => {
    setSelectedUser("")
    setSelectedStatus("")
    setPinnedStatuses(DEFAULT_STATUSES)
    setSelectedArtisanStatuses([])
    setSelectedDossierStatuses([])
    setPinnedFilters({ artisanStatus: false, dossierStatus: false })
    setDateRange({ from: null, to: null })
    setStatusColors(
      INTERVENTION_STATUS_CONFIG.reduce<Record<string, string>>((acc, status) => {
        acc[status.key] = status.defaultColor
        return acc
      }, {}),
    )
  }

  const filtersActive =
    selectedUser ||
    selectedStatus ||
    quickPinnedStatuses.some((status) => !DEFAULT_STATUSES.includes(status)) ||
    selectedArtisanStatuses.length > 0 ||
    selectedDossierStatuses.length > 0 ||
    pinnedFilters.artisanStatus ||
    pinnedFilters.dossierStatus ||
    dateRange.from ||
    dateRange.to

  const renderedList = (
    <div
      ref={listRef}
      onWheel={handleWheel}
      className={"space-y-2 transition-all duration-300 " +
        (scrollDirection === "right"
          ? "translate-x-2 opacity-90"
          : scrollDirection === "left"
            ? "-translate-x-2 opacity-90"
            : "")}
    >
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-16 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        searched.map((intervention, index) => (
          <div
            key={intervention.id}
            data-intervention-index={index}
            className={
              "relative rounded-lg p-1 transition-all duration-200 " +
              (isKeyboardMode && keyboardSelectedIndex === index
                ? "bg-primary/10 shadow-lg scale-[1.01]"
                : "hover:bg-muted/60")
            }
            onClick={() => {
              setIsKeyboardMode(false)
              document.body.style.cursor = "auto"
              setKeyboardSelectedIndex(index)
              setSelectedActionIndex(-1)
              setSelectedCardIndex(-1)
            }}
            ref={(el) => {
              cardRefs.current[intervention.id] = el
            }}
          >
            {isKeyboardMode && keyboardSelectedIndex === index && (
              <div className="absolute -top-2 -left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                Sélectionné
              </div>
            )}
            <InterventionCard
              intervention={intervention}
              onEdit={(item) => setSelectedIntervention(item)}
              onSendEmail={onSendEmail}
              onCall={onCall}
              onAddDocument={onAddDocument}
              onStatusChange={handleStatusChange}
              onCoutSSTChange={handleCoutSSTChange}
              onCoutMateriauxChange={handleCoutMateriauxChange}
              onCoutInterventionsChange={handleCoutInterventionsChange}
              onUserChange={handleUserChange}
              hideBorder={isKeyboardMode && keyboardSelectedIndex === index}
              keyboardHovered={isKeyboardMode && keyboardSelectedIndex === index}
              selectedActionIndex={isKeyboardMode && keyboardSelectedIndex === index ? selectedActionIndex : -1}
              selectedCardIndex={isKeyboardMode && keyboardSelectedIndex === index ? selectedCardIndex : -1}
              expanded={expandedId === intervention.id}
              onToggle={() => handleToggleExpand(intervention.id)}
              statusColors={statusColors}
              pinnedStatuses={quickPinnedStatuses}
              onTogglePinnedStatus={handleTogglePinnedStatus}
              onStatusColorChange={handleStatusColorChange}
            />
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />

      <div className="flex-1 space-y-6 p-6">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Recherche (contexte, client)"
                    className="w-[260px] pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-between">
                        {selectedUser || "Tous les utilisateurs"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuItem onClick={() => setSelectedUser("")}>Tous</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {uniqueUsers.map((user) => (
                        <DropdownMenuItem key={user} onClick={() => setSelectedUser(user)}>
                          {user}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={dateRange.from ?? ""}
                      onChange={(event) => setDateRange((prev) => ({ ...prev, from: event.target.value || null }))}
                      className="w-[150px]"
                    />
                    <span className="text-xs text-muted-foreground">→</span>
                    <Input
                      type="date"
                      value={dateRange.to ?? ""}
                      onChange={(event) => setDateRange((prev) => ({ ...prev, to: event.target.value || null }))}
                      className="w-[150px]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu open={showStatusMenu} onOpenChange={setShowStatusMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Épingler des statuts
                      </div>
                      {additionalStatuses.length === 0 && (
                        <div className="px-3 pb-3 text-xs text-muted-foreground">Aucun statut supplémentaire.</div>
                      )}
                      {additionalStatuses.map((status) => (
                        <DropdownMenuItem key={status} onClick={() => handleAddPinnedStatus(status)}>
                          + {status}
                        </DropdownMenuItem>
                      ))}
                      {pinnedStatuses.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <div className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Épinglés</div>
                          {pinnedStatuses.map((status) => (
                            <DropdownMenuItem key={status} onClick={() => handleRemovePinnedStatus(status)}>
                              − {status}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[150px] justify-between">
                        {(() => {
                          switch (sortField) {
                            case "cree":
                              return "Tri: création"
                            case "echeance":
                              return "Tri: échéance"
                            case "marge":
                              return "Tri: marge"
                          }
                        })()}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem onClick={() => setSortField("cree")}>Création</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortField("echeance")}>Échéance</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortField("marge")}>Marge</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[120px] justify-between">
                        {sortDir === "asc" ? "Ascendant" : "Descendant"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuItem onClick={() => setSortDir("asc")}>Ascendant</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortDir("desc")}>Descendant</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Exporter">
                  <Download className="h-4 w-4" />
                </Button>

                <DropdownMenu open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-8 w-8">
                      <Filter className="h-4 w-4" />
                      {(pinnedFilters.artisanStatus || pinnedFilters.dossierStatus) && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() =>
                        setPinnedFilters((prev) => ({ ...prev, artisanStatus: !prev.artisanStatus }))
                      }
                    >
                      <span className="flex-1">Statut artisan</span>
                      {pinnedFilters.artisanStatus && <span className="text-xs text-primary">épinglé</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setPinnedFilters((prev) => ({ ...prev, dossierStatus: !prev.dossierStatus }))
                      }
                    >
                      <span className="flex-1">Statut dossier</span>
                      {pinnedFilters.dossierStatus && <span className="text-xs text-primary">épinglé</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="w-72 p-4 text-xs">
                      <div className="space-y-2">
                        <div className="font-semibold">Navigation clavier</div>
                        <div>Entrée : ouvrir le panneau de détails</div>
                        <div>Tab : fixer la sélection dans la sidebar</div>
                        <div>↑/↓ : changer d&rsquo;intervention</div>
                        <div>←/→ : naviguer entre les actions (email, appel, document)</div>
                        <div>Quand l&rsquo;action document est sélectionnée, ↑/↓/←/→ naviguent dans les cartes</div>
                        <div>Échap : réinitialiser la sélection</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {pinnedFilters.artisanStatus && uniqueArtisanStatuses.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {uniqueArtisanStatuses.map((status) => {
                  const active = selectedArtisanStatuses.includes(status)
                  return (
                    <Button
                      key={status}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setSelectedArtisanStatuses((prev) =>
                          prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
                        )
                      }
                    >
                      {status}
                    </Button>
                  )
                })}
              </div>
            )}

            {pinnedFilters.dossierStatus && uniqueDossierStatuses.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {uniqueDossierStatuses.map((status) => {
                  const active = selectedDossierStatuses.includes(status)
                  return (
                    <Button
                      key={status}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setSelectedDossierStatuses((prev) =>
                          prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
                        )
                      }
                    >
                      {status}
                    </Button>
                  )
                })}
              </div>
            )}

            {filtersActive && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleResetFilters}>
                Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={selectedStatus === "" ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedStatus("")}
                >
                  Toutes ({getCountByStatus("")})
                </Button>
                {displayedStatuses.map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedStatus(status)}
                  >
                    {status} ({getCountByStatus(status)})
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {Math.abs(scrollAccumulator) > 0 && (
                  <div className="flex items-center gap-2">
                    <span>Scroll horizontal détecté…</span>
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className={(scrollAccumulator > 0 ? "bg-blue-500" : "bg-rose-500") + " h-full transition-all"}
                        style={{ width: `${Math.min(Math.abs(scrollAccumulator) / scrollThreshold * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="space-y-4">
              <TabsList>
                <TabsTrigger value="list">Liste</TabsTrigger>
                <TabsTrigger value="grid">Grille</TabsTrigger>
              </TabsList>

              <TabsContent value="list">{renderedList}</TabsContent>

              <TabsContent value="grid">
                {loading ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <div key={item} className="h-36 rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {searched.map((item, index) => (
                      <InterventionCard
                        key={item.id}
                        intervention={item}
                        onEdit={(intervention) => setSelectedIntervention(intervention)}
                        onSendEmail={onSendEmail}
                        onCall={onCall}
                        onAddDocument={onAddDocument}
                        onStatusChange={handleStatusChange}
                        onCoutSSTChange={handleCoutSSTChange}
                        onCoutMateriauxChange={handleCoutMateriauxChange}
                        onCoutInterventionsChange={handleCoutInterventionsChange}
                        onUserChange={handleUserChange}
                        keyboardHovered={isKeyboardMode && keyboardSelectedIndex === index}
                        selectedActionIndex={isKeyboardMode && keyboardSelectedIndex === index ? selectedActionIndex : -1}
                        selectedCardIndex={isKeyboardMode && keyboardSelectedIndex === index ? selectedCardIndex : -1}
                        expanded={expandedId === item.id}
                        onToggle={() => handleToggleExpand(item.id)}
                        statusColors={statusColors}
                        pinnedStatuses={quickPinnedStatuses}
                        onTogglePinnedStatus={handleTogglePinnedStatus}
                        onStatusColorChange={handleStatusColorChange}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {selectedIntervention && (
        <div className="fixed right-6 top-24 bottom-6 w-96 z-50">
          <InterventionDetailCard
            intervention={selectedIntervention}
            onClose={() => setSelectedIntervention(null)}
            onSendEmail={() => console.log("TODO: send email", selectedIntervention.id)}
            onCall={() => console.log("TODO: call", selectedIntervention.id)}
            className="h-full overflow-y-auto"
          />
        </div>
      )}
    </div>
  )
}
