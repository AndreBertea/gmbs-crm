"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { ChangeEvent, ReactNode, CSSProperties } from "react"
import { AlignCenter, AlignLeft, AlignRight, Bell, Bold, ChevronDown, Eye, Filter, Italic, Loader2, Send, X } from "lucide-react"

import { useColumnResize } from "@/hooks/useColumnResize"
import { useInterventionReminders } from "@/hooks/useInterventionReminders"
import { runQuery, getPropertyValue } from "@/lib/query-engine"
import { SCROLL_CONFIG } from "@/config/interventions"
import { toDate } from "@/lib/date-utils"
import { getPropertyLabel, getPropertySchema } from "@/types/property-schema"
import type { InterventionView as InterventionEntity } from "@/types/intervention-view"
import type {
  InterventionViewByLayout,
  TableLayoutOptions,
  TableColumnAppearance,
  TableColumnStyle,
  TableColumnTextSize,
  TableColumnAlignment,
  TableStatusBorderSize,
  TableShadowIntensity,
  TableRowDisplayMode,
  TableRowDensity,
} from "@/types/intervention-views"
import { TABLE_STATUS_BORDER_WIDTHS, TABLE_SHADOW_INTENSITIES } from "@/types/intervention-views"
import type { ViewFilter } from "@/types/intervention-views"
import type { PropertySchema } from "@/types/property-schema"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPortal,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { ReminderMentionInput } from "@/components/interventions/ReminderMentionInput"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import {
  STYLE_ELIGIBLE_COLUMNS,
  TABLE_APPEARANCE_OPTIONS,
  TABLE_TEXT_SIZE_OPTIONS,
  normalizeColumnStyle,
} from "@/lib/interventions/column-style"
import { TABLE_ALIGNMENT_OPTIONS } from "./column-alignment-options"
import type { InterventionModalOpenOptions } from "@/hooks/useInterventionModal"

const DEFAULT_TABLE_HEIGHT = "calc(100vh - var(--table-view-offset))"

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" })

type NoteDialogContentProps = React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>

const NoteDialogContent = React.forwardRef<HTMLDivElement, NoteDialogContentProps>(
  ({ className, ...props }, ref) => (
    <AlertDialogPortal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[55] bg-black/20 pointer-events-none" />
      <AlertDialogPrimitive.Content ref={ref} className={className} {...props} />
    </AlertDialogPortal>
  ),
)

NoteDialogContent.displayName = "NoteDialogContent"

type TableViewProps = {
  view: InterventionViewByLayout<"table">
  interventions: InterventionEntity[]
  loading: boolean
  error: string | null
  onInterventionClick?: (id: string, options?: InterventionModalOpenOptions) => void
  onLayoutOptionsChange?: (patch: Partial<TableLayoutOptions>) => void
  onPropertyFilterChange?: (property: string, filter: ViewFilter | null) => void
  allInterventions?: InterventionEntity[]
  loadDistinctValues?: (property: string) => Promise<string[]>
  totalCount?: number
}


type CellRender = {
  content: ReactNode
  backgroundColor?: string
  defaultTextColor?: string
  cellClassName?: string
  statusGradient?: string  // 🆕 Pour remplacer le gradient général par la couleur du statut
}

const resolveThemeMode = (): "dark" | "light" => {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

const toSoftColor = (hex: string | undefined, mode: "light" | "dark", fallback = "#cbd5f5") => {
  if (!hex) return fallback
  const sanitized = hex.replace("#", "")
  if (sanitized.length !== 6) return fallback
  const numeric = Number.parseInt(sanitized, 16)
  const r = (numeric >> 16) & 255
  const g = (numeric >> 8) & 255
  const b = numeric & 255
  const mixTarget = mode === "dark" ? 0 : 255
  const factor = mode === "dark" ? 0.45 : 0.7
  const mixChannel = (channel: number) => Math.round(channel + (mixTarget - channel) * factor)
  const color = `rgb(${mixChannel(r)}, ${mixChannel(g)}, ${mixChannel(b)})`
  return color
}

const getReadableTextColor = (hex: string | undefined, fallback = "#ffffff") => {
  if (!hex) return fallback
  const sanitized = hex.replace("#", "")
  if (sanitized.length !== 6) return fallback
  const r = Number.parseInt(sanitized.slice(0, 2), 16)
  const g = Number.parseInt(sanitized.slice(2, 4), 16)
  const b = Number.parseInt(sanitized.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? "#111827" : "#FFFFFF"
}

const getRowHeight = (density: TableRowDensity): number => {
  switch (density) {
    case "ultra-dense":
      return 28
    case "dense":
      return 36
    case "default":
      return 44
    default:
      return 36
  }
}

const renderCell = (
  intervention: InterventionEntity,
  property: string,
  style: TableColumnStyle | undefined,
  themeMode: "light" | "dark",
): CellRender => {
  const schema = getPropertySchema(property)
  const value = getPropertyValue(intervention, property)

  if (!schema) {
    return { content: value == null || value === "" ? "—" : String(value) }
  }

  if (property === "statusValue") {
    if (!value) return { content: "—" }
    const option = schema.options?.find((item) => item.value === value)
    const statusInfo = (intervention as any).status as { color?: string; label?: string } | undefined
    const hex =
      statusInfo?.color ??
      (intervention as any).statusColor ??
      option?.color ??
      "#3B82F6"
    const label = statusInfo?.label ?? option?.label ?? String(value)
    const appearance: TableColumnAppearance = style?.appearance ?? "solid"
    if (appearance === "none") {
      return { content: label }
    }
    if (appearance === "badge") {
      const textColor = style?.textColor ?? getReadableTextColor(hex)
      return {
        content: (
          <span
            className="inline-flex items-center justify-center rounded-full px-2 py-0.5 leading-tight"
            style={{ backgroundColor: hex, color: textColor }}
          >
            {label}
          </span>
        ),
        cellClassName: "font-medium",
      }
    }
    const pastel = toSoftColor(hex, themeMode)
    return {
      content: label,
      backgroundColor: pastel,
      defaultTextColor: themeMode === "dark" ? "#F3F4F6" : "#111827",
      cellClassName: "font-medium",
      // 🆕 En mode gradient, utiliser la couleur du statut
      statusGradient: `linear-gradient(
        to bottom,
        color-mix(in oklab, ${hex}, white 20%) 0%,
        ${hex} 50%,
        color-mix(in oklab, ${hex}, black 20%) 100%
      )`,
    }
  }

  if (property === "attribueA") {
    const assignedCode =
      (intervention as any).assignedUserCode ??
      (typeof value === "string" ? value : value == null ? "" : String(value))
    if (!assignedCode) return { content: "—" }
    const color = (intervention as any).assignedUserColor as string | undefined
    const appearance: TableColumnAppearance = style?.appearance ?? "solid"
    if (!color || appearance === "none") {
      return { content: assignedCode }
    }
    if (appearance === "badge") {
      const textColor = style?.textColor ?? getReadableTextColor(color, "#111827")
      return {
        content: (
          <span
            className="inline-flex items-center justify-center rounded-full px-2 py-0.5 leading-tight"
            style={{ backgroundColor: color, color: textColor }}
          >
            {assignedCode}
          </span>
        ),
        cellClassName: "font-medium",
      }
    }
    const pastel = toSoftColor(color, themeMode, themeMode === "dark" ? "#1f2937" : "#e2e8f0")
    return {
      content: assignedCode,
      backgroundColor: pastel,
      defaultTextColor: themeMode === "dark" ? "#E5E7EB" : "#111827",
      cellClassName: "font-medium",
      // 🆕 En mode gradient, utiliser la couleur de l'utilisateur
      statusGradient: `linear-gradient(
        to bottom,
        color-mix(in oklab, ${color}, white 20%) 0%,
        ${color} 50%,
        color-mix(in oklab, ${color}, black 20%) 100%
      )`,
    }
  }

  switch (schema.type) {
    case "date": {
      if (!value) return { content: "—" }
      const date = new Date(String(value))
      return { content: Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date) }
    }
    case "number": {
      if (typeof value !== "number") return { content: value == null ? "—" : String(value) }
      return { content: numberFormatter.format(value) }
    }
    case "select":
    case "multi_select": {
      if (!value) return { content: "—" }
      if (schema.type === "multi_select" && Array.isArray(value)) {
        return {
          content: value
            .map((item) => schema.options?.find((option) => option.value === item)?.label ?? String(item))
            .join(", "),
        }
      }
      const option = schema.options?.find((option) => option.value === value)
      return { content: option?.label ?? String(value) }
    }
    case "checkbox":
      return { content: value ? "Oui" : "Non" }
    default:
      return { content: value == null || value === "" ? "—" : String(value) }
  }
}

const sizeClassMap: Record<TableColumnTextSize, string> = {
  xl: "text-xl",
  lg: "text-lg",
  md: "text-sm",
  sm: "text-xs",
  xs: "text-[0.65rem]",
}

const buildTypographyClasses = (style: TableColumnStyle | undefined) => {
  const classes = [sizeClassMap[style?.textSize ?? "md"]]
  if (style?.bold) {
    classes.push("font-semibold")
  }
  if (style?.italic) {
    classes.push("italic")
  }
  return classes.join(" ")
}

export function TableView({
  view,
  interventions,
  loading,
  error,
  onInterventionClick,
  onLayoutOptionsChange,
  onPropertyFilterChange,
  allInterventions,
  loadDistinctValues,
  totalCount,
}: TableViewProps) {
  const dataset = useMemo(() => {
    // ⚠️ NE PAS réappliquer les filtres/sorts de la vue !
    // Ils sont déjà appliqués côté serveur + residualFilters dans page.tsx
    // Si on les réapplique ici, on filtre 2 fois les mêmes données !
    return interventions;
  }, [interventions])
  const orderedIds = useMemo(() => dataset.map((item) => item.id), [dataset])
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const {
    reminders,
    saveReminder,
    toggleReminder,
    getReminderNote,
    getReminderDueDate,
    getReminderMentions,
    removeReminder,
  } = useInterventionReminders()
  const [showTopFade, setShowTopFade] = useState(false)
  const [showBottomFade, setShowBottomFade] = useState(true)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [noteDialogInterventionId, setNoteDialogInterventionId] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState("")
  const [dueDateValue, setDueDateValue] = useState<Date | null>(null)
  const [mentionIds, setMentionIds] = useState<string[]>([])
  const [noteDialogCoords, setNoteDialogCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const noteDialogContentRef = useRef<HTMLDivElement | null>(null)
  const isReminderSaveDisabled = noteValue.trim().length === 0 && !dueDateValue
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  const columnWidths = view.layoutOptions.columnWidths ?? {}
  const tableLayoutOptions = view.layoutOptions as TableLayoutOptions
  const columnStyles = tableLayoutOptions.columnStyles ?? {}
  const columnAlignment = tableLayoutOptions.columnAlignment ?? {}
  const statusBorderSize = (tableLayoutOptions.statusBorderSize ?? "m") as TableStatusBorderSize
  const statusBorderWidth = TABLE_STATUS_BORDER_WIDTHS[statusBorderSize] ?? TABLE_STATUS_BORDER_WIDTHS.m
  const statusBorderWidthPx = `${statusBorderWidth}px`
  const statusBorderEnabled = tableLayoutOptions.showStatusBorder ?? false
  const coloredShadow = tableLayoutOptions.coloredShadow ?? false
  const shadowIntensity = (tableLayoutOptions.shadowIntensity ?? "normal") as TableShadowIntensity
  const shadowValues = TABLE_SHADOW_INTENSITIES[shadowIntensity]
  const rowDisplayMode = (tableLayoutOptions.rowDisplayMode ?? "stripes") as TableRowDisplayMode
  const useAccentColor = tableLayoutOptions.useAccentColor ?? false
  const rowDensity = (tableLayoutOptions.rowDensity ??
    (tableLayoutOptions.dense ? "dense" : "default")) as TableRowDensity
  const densityTableClass =
    rowDensity === "ultra-dense" ? "text-xs" : rowDensity === "dense" ? "text-sm" : undefined
  const densityHeaderClass =
    rowDensity === "ultra-dense"
      ? "!h-8 !py-1.5 !pl-2.5 !pr-2.5"
      : rowDensity === "dense"
        ? "!h-10 !py-2 !pl-3 !pr-3"
        : undefined
  const densityCellClass =
    rowDensity === "ultra-dense"
      ? "!py-1.5 !pl-2.5 !pr-2.5"
      : rowDensity === "dense"
        ? "!py-2 !pl-3 !pr-3"
        : "py-3"
  const rowHeight = getRowHeight(rowDensity)
  const computeTableHeight = useCallback(() => {
    if (typeof window === "undefined") {
      return DEFAULT_TABLE_HEIGHT
    }

    const offset = 225
    return `calc(${window.innerHeight}px - ${offset}px)`
  }, [])
  const [tableViewportHeight, setTableViewportHeight] = useState<string>(DEFAULT_TABLE_HEIGHT)
  const isBrowser = typeof window !== "undefined"
  const isFirefox = isBrowser && typeof navigator !== "undefined" ? /firefox/i.test(navigator.userAgent) : false
  const rowVirtualizer = useVirtualizer({
    count: dataset.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: SCROLL_CONFIG.OVERSCAN,
    measureElement: isBrowser && !isFirefox ? (element) => element.getBoundingClientRect().height : undefined,
    scrollMargin: tableContainerRef.current?.offsetTop ?? 0,
    getItemKey: (index) => dataset[index]?.id ?? index,
  })
  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalHeight = rowVirtualizer.getTotalSize()

  const firstVisible = virtualItems[0]?.index ?? 0
  const lastVisible = virtualItems[virtualItems.length - 1]?.index ?? 0
  const totalRows = totalCount ?? dataset.length
  const showPositionIndicator = totalRows > SCROLL_CONFIG.SHOW_POSITION_THRESHOLD

  const tableInlineStyle: CSSProperties & Record<string, any> = {
    ...(statusBorderEnabled ? { "--table-status-border-width": statusBorderWidthPx } : {}),
    ...(coloredShadow
      ? {
          "--shadow-intensity-strong": `${shadowValues.strong}%`,
          "--shadow-intensity-soft": `${shadowValues.soft}%`,
        }
      : {}),
    ...(rowDisplayMode === "gradient" ? { "--use-gradient-mode": "1" } : {}),
    ...(useAccentColor ? { "--use-accent-color": "1" } : {}),
  }
  const [styleMenu, setStyleMenu] = useState<{ property: string; x: number; y: number } | null>(null)
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light")
  const styleMenuRef = useRef<HTMLDivElement | null>(null)
  const { activeColumn, handlePointerDown } = useColumnResize(columnWidths, (widths) => {
    onLayoutOptionsChange?.({ columnWidths: widths })
  })
  const handleScrollWithFades = useCallback(() => {
    const scroller = tableContainerRef.current
    if (!scroller) return

    const { scrollTop, scrollHeight, clientHeight } = scroller
    const scrollBottom = scrollHeight - scrollTop - clientHeight

    setShowTopFade(scrollTop > rowHeight * 0.5)
    setShowBottomFade(scrollBottom > rowHeight * 0.5)
  }, [rowHeight])

  useEffect(() => {
    handleScrollWithFades()
  }, [handleScrollWithFades, dataset.length, expandedRowId, tableViewportHeight, virtualItems.length])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleResize = () => {
      setTableViewportHeight(computeTableHeight())
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [computeTableHeight])

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return

    const updateTheme = () => setThemeMode(resolveThemeMode())
    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    media.addEventListener("change", updateTheme)

    return () => {
      observer.disconnect()
      media.removeEventListener("change", updateTheme)
    }
  }, [])

  useEffect(() => {
    if (!styleMenu) return

    const handleDismiss = (event: MouseEvent | PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (styleMenuRef.current?.contains(target)) {
        return
      }
      const path = typeof event.composedPath === "function" ? event.composedPath() : []
      const isInsidePortal = path.some(
        (node) => node instanceof HTMLElement && node.hasAttribute("data-quick-style-panel"),
      )
      if (isInsidePortal) {
        return
      }
      setStyleMenu(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStyleMenu(null)
      }
    }

    window.addEventListener("pointerdown", handleDismiss)
    window.addEventListener("click", handleDismiss)
    window.addEventListener("contextmenu", handleDismiss)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("pointerdown", handleDismiss)
      window.removeEventListener("click", handleDismiss)
      window.removeEventListener("contextmenu", handleDismiss)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [styleMenu])

  useEffect(() => {
    setStyleMenu(null)
  }, [view.id])

  const handleHeaderContextMenu = useCallback(
    (event: React.MouseEvent, property: string) => {
      if (!onLayoutOptionsChange) return
      event.preventDefault()
      event.stopPropagation()
      if (typeof window === "undefined") {
        setStyleMenu({ property, x: event.clientX, y: event.clientY })
        return
      }
      const padding = 12
      const panelWidth = 420
      const panelHeight = 120
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const x = Math.max(padding, Math.min(event.clientX, viewportWidth - panelWidth - padding))
      const y = Math.max(padding, Math.min(event.clientY, viewportHeight - panelHeight - padding))
      setStyleMenu({ property, x, y })
    },
    [onLayoutOptionsChange],
  )

  const applyColumnStyle = useCallback(
    (property: string, updater: (prev: TableColumnStyle) => TableColumnStyle) => {
      if (!onLayoutOptionsChange) return
      const current = columnStyles[property] ?? {}
      const nextRaw = updater({ ...current })
      const normalized = normalizeColumnStyle(property, nextRaw)
      const nextStyles = { ...columnStyles }
      if (normalized) {
        nextStyles[property] = normalized
      } else {
        delete nextStyles[property]
      }
      onLayoutOptionsChange({
        columnStyles: nextStyles,
      })
    },
    [columnStyles, onLayoutOptionsChange],
  )

  const applyColumnAlignment = useCallback(
    (property: string, nextAlignment: TableColumnAlignment) => {
      if (!onLayoutOptionsChange) return
      const nextAlignments = { ...columnAlignment }
      if (nextAlignment === "center") {
        if (!columnAlignment[property]) return
        delete nextAlignments[property]
        onLayoutOptionsChange({ columnAlignment: nextAlignments })
        return
      }
      if (columnAlignment[property] === nextAlignment) return
      nextAlignments[property] = nextAlignment
      onLayoutOptionsChange({ columnAlignment: nextAlignments })
    },
    [columnAlignment, onLayoutOptionsChange],
  )

  const handleReminderContextMenu = useCallback(
    (event: React.MouseEvent, interventionId: string) => {
      event.preventDefault()
      event.stopPropagation()
      const existingNote = getReminderNote(interventionId) ?? ""
      const existingDueDate = getReminderDueDate(interventionId)
      const existingMentions = getReminderMentions(interventionId)
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      const DIALOG_WIDTH = 448
      const DIALOG_HEIGHT = 360
      const GAP = 8

      let left = rect.left - DIALOG_WIDTH - GAP
      if (left < 16) {
        left = rect.right + GAP
      }
      left = Math.max(16, Math.min(left, window.innerWidth - DIALOG_WIDTH - 16))

      let top = rect.top
      if (top + DIALOG_HEIGHT > window.innerHeight - 16) {
        top = window.innerHeight - DIALOG_HEIGHT - 16
      }
      top = Math.max(16, top)

      setNoteDialogCoords({ top, left })
      setNoteDialogInterventionId(interventionId)
      setNoteValue(existingNote)
      setDueDateValue(existingDueDate ? new Date(existingDueDate) : null)
      const validMentionIds = existingMentions.filter((mention) => uuidPattern.test(mention))
      setMentionIds(validMentionIds)
      setShowNoteDialog(true)
    },
    [getReminderDueDate, getReminderMentions, getReminderNote],
  )

  const handleNoteSave = useCallback(async () => {
    if (!noteDialogInterventionId) return
    const cleaned = noteValue.trim()
    const dueDateIso = dueDateValue ? dueDateValue.toISOString() : null
    const hasContent = cleaned.length > 0 || dueDateIso

    if (hasContent) {
      await saveReminder({
        interventionId: noteDialogInterventionId,
        note: cleaned.length > 0 ? cleaned : null,
        dueDate: dueDateIso,
        mentionedUserIds: mentionIds,
      })
    } else {
      await removeReminder(noteDialogInterventionId)
    }

    setShowNoteDialog(false)
    setNoteDialogInterventionId(null)
    setNoteValue("")
    setDueDateValue(null)
    setMentionIds([])
  }, [dueDateValue, mentionIds, noteDialogInterventionId, noteValue, removeReminder, saveReminder])

  const handleNoteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setShowNoteDialog(false)
      setNoteDialogInterventionId(null)
      setNoteValue("")
      setDueDateValue(null)
      setMentionIds([])
    } else {
      setShowNoteDialog(true)
    }
  }, [])

  let quickStylePanel: ReactNode = null
  if (styleMenu) {
    const propertyKey = styleMenu.property
    const propertyLabel = getPropertyLabel(propertyKey)
    const styleEntry = columnStyles[propertyKey] ?? {}
    const sizeValue = styleEntry.textSize ?? "md"
    const isBold = Boolean(styleEntry.bold)
    const isItalic = Boolean(styleEntry.italic)
    const colorValue = styleEntry.textColor ?? "#111827"
    const isAppearanceEditable = STYLE_ELIGIBLE_COLUMNS.has(propertyKey)
    const appearanceValue: TableColumnAppearance = isAppearanceEditable
      ? styleEntry.appearance ?? "solid"
      : "none"
    const alignmentValue = (columnAlignment[propertyKey] ?? "center") as TableColumnAlignment

    quickStylePanel = (
      <div
        ref={styleMenuRef}
        data-quick-style-panel="true"
        className="fixed z-[95] min-w-[340px] max-w-[420px] rounded-lg border border-border bg-popover p-3 shadow-xl"
        style={{ top: styleMenu.y, left: styleMenu.x }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground">{propertyLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setStyleMenu(null)}
            aria-label="Fermer le style rapide"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[0.7rem]">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Taille</span>
            <Select
              value={sizeValue}
              onValueChange={(value) =>
                applyColumnStyle(propertyKey, (prev) => ({
                  ...prev,
                  textSize: value as TableColumnTextSize,
                }))
              }
            >
              <SelectTrigger data-quick-style-panel="true" className="h-7 w-[78px] text-[0.7rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-quick-style-panel="true" className="z-[110]">
                {TABLE_TEXT_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Style</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7 text-muted-foreground",
                  isBold && "border border-primary/60 bg-primary/10 text-primary",
                )}
                onClick={() =>
                  applyColumnStyle(propertyKey, (prev) => ({
                    ...prev,
                    bold: !isBold,
                  }))
                }
                aria-label={`Basculer en gras (${propertyLabel})`}
              >
                <Bold className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7 text-muted-foreground",
                  isItalic && "border border-primary/60 bg-primary/10 text-primary",
                )}
                onClick={() =>
                  applyColumnStyle(propertyKey, (prev) => ({
                    ...prev,
                    italic: !isItalic,
                  }))
                }
                aria-label={`Basculer en italique (${propertyLabel})`}
              >
                <Italic className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Couleur</span>
            <div className="flex items-center gap-1">
              <input
                data-quick-style-panel="true"
                type="color"
                value={colorValue}
                onChange={(event) => {
                  const nextColor = event.target.value
                  applyColumnStyle(propertyKey, (prev) => ({
                    ...prev,
                    textColor: nextColor,
                  }))
                }}
                className="h-7 w-7 cursor-pointer rounded border border-border"
                aria-label={`Couleur du texte (${propertyLabel})`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() =>
                  applyColumnStyle(propertyKey, (prev) => ({
                    ...prev,
                    textColor: undefined,
                  }))
                }
                aria-label={`Réinitialiser la couleur (${propertyLabel})`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Alignement</span>
            <div className="flex items-center gap-1">
              {TABLE_ALIGNMENT_OPTIONS.map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-7 w-7 text-muted-foreground",
                    alignmentValue === value && "border border-primary/60 bg-primary/10 text-primary",
                  )}
                  onClick={() => applyColumnAlignment(propertyKey, value)}
                  aria-label={`${label} (${propertyLabel})`}
                >
                  <Icon className="h-3 w-3" />
                </Button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-1",
              !isAppearanceEditable && "opacity-60",
            )}
          >
            <span className="text-muted-foreground">Affichage</span>
              <Select
                value={appearanceValue}
              disabled={!isAppearanceEditable}
              onValueChange={(value) => {
                if (!isAppearanceEditable) return
                applyColumnStyle(propertyKey, (prev) => ({
                  ...prev,
                  appearance: value as TableColumnAppearance,
                }))
              }}
            >
              <SelectTrigger
                data-quick-style-panel="true"
                className={cn(
                  "h-7 w-[140px] text-[0.7rem]",
                  !isAppearanceEditable && "cursor-not-allowed opacity-60",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-quick-style-panel="true" className="z-[110]">
                {TABLE_APPEARANCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <>
      {showPositionIndicator && (
        <div className="fixed right-6 bottom-6 z-40 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col items-end text-xs">
            <span className="font-medium text-foreground">
              {(firstVisible + 1).toLocaleString()} - {(lastVisible + 1).toLocaleString()}
            </span>
            <span className="text-muted-foreground">sur {totalRows.toLocaleString()}</span>
          </div>
        </div>
      )}

      <Card className="card-table-wrapper">
        <div
          className={cn(
            "table-horizontal-wrapper overflow-x-auto",
            densityTableClass,
            statusBorderEnabled && "table-has-status-border",
          )}
        >
          <div className="min-w-fit" style={tableInlineStyle}>
            <table
              className={cn(
                "data-table shadcn-table border-separate border-spacing-0 caption-bottom text-sm",
                densityTableClass,
                statusBorderEnabled && "table-has-status-border",
              )}
              style={{
                ...tableInlineStyle,
                tableLayout: "fixed",
                width: "max-content",
                minWidth: "100%",
              }}
            >
              <thead className="z-20">
                <tr className="border-b border-border/60 bg-muted/30">
                  {view.visibleProperties.map((property) => {
                    const width = columnWidths[property] ?? 150 // Largeur par défaut si non définie
                    const schema = getPropertySchema(property)
                    const activeFilter = view.filters.find((filter) => filter.property === property)
                    const headerStyle: CSSProperties = {
                      width,
                      minWidth: width,
                      maxWidth: width,
                    }
                    return (
                      <th
                        key={property}
                        style={headerStyle}
                        className={cn(
                          "z-20 border-b border-border bg-muted/95 px-4 py-4 text-left text-sm font-semibold text-foreground",
                          "whitespace-nowrap backdrop-blur-sm align-middle relative select-none",
                          densityHeaderClass,
                        )}
                        onContextMenu={(event) => handleHeaderContextMenu(event, property)}
                      >
                        <div className="relative flex items-center gap-2">
                          {schema?.filterable && onPropertyFilterChange ? (
                            <ColumnFilterTrigger
                              property={property}
                              schema={schema}
                              activeFilter={activeFilter}
                              interventions={allInterventions ?? interventions}
                              loadDistinctValues={loadDistinctValues}
                              onFilterChange={onPropertyFilterChange}
                            />
                          ) : (
                            <span>{getPropertyLabel(property)}</span>
                          )}
                          <div
                            className={cn(
                              "absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors duration-150",
                              activeColumn === property
                                ? "bg-primary"
                                : "opacity-0 hover:opacity-100 hover:bg-primary/70",
                            )}
                            onPointerDown={(event) => handlePointerDown(event, property)}
                          />
                        </div>
                      </th>
                    )
                  })}
                  <th
                    style={{ width: 100, minWidth: 100, maxWidth: 100 }}
                    className={cn(
                      "z-20 border-b border-border bg-muted/95 px-4 py-4 text-left text-sm font-semibold text-foreground",
                      "whitespace-nowrap backdrop-blur-sm align-middle relative select-none",
                      densityHeaderClass,
                    )}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
            </table>

            <div className="relative">
              <div
                ref={tableContainerRef}
                className="table-scroll-wrapper relative h-full overflow-y-auto overflow-x-hidden"
                onScroll={handleScrollWithFades}
                style={{
                  height: tableViewportHeight,
                  maxHeight: tableViewportHeight,
                  minHeight: "320px",
                  scrollbarWidth: "thin",
                  scrollbarColor:
                    themeMode === "dark"
                      ? "rgba(255,255,255,0.2) rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.2) rgba(0,0,0,0.05)",
                }}
              >
                <table
                  className={cn(
                    "data-table shadcn-table border-separate border-spacing-0 caption-bottom text-sm",
                    densityTableClass,
                    statusBorderEnabled && "table-has-status-border",
                  )}
                  style={{
                    ...tableInlineStyle,
                    tableLayout: "fixed",
                    width: "max-content",
                    minWidth: "100%",
                  }}
                >
                  <tbody>
                    {dataset.length === 0 ? (
                      <tr>
                        <td
                          colSpan={Math.max(view.visibleProperties.length + 1, 1)}
                          className="px-4 py-12 text-center text-sm text-muted-foreground"
                        >
                          Aucune intervention ne correspond à ces filtres. Ajustez votre sélection pour reprendre l'affichage.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {virtualItems.length > 0 && (
                          <tr style={{ height: `${Math.max(virtualItems[0].start, 0)}px` }} />
                        )}

                        {virtualItems.map((virtualRow) => {
                          const intervention = dataset[virtualRow.index]
                          const rowIndex = virtualRow.index
                          const statusColor =
                            ((intervention as any).status?.color as string | undefined) ??
                            (intervention as any).statusColor ??
                            "#3B82F6"
                          const isExpanded = expandedRowId === intervention.id

                          const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
                            if (isExpanded) {
                              setExpandedRowId(null)
                            } else {
                              setExpandedRowId(intervention.id)
                            }
                          }

                          return (
                            <React.Fragment key={intervention.id}>
                              <tr
                                data-intervention-id={intervention.id}
                                className={cn(
                                  "group cursor-pointer border-b border-border/30 transition-colors duration-150 hover:bg-accent/10 data-[state=selected]:hover:bg-muted",
                                  statusBorderEnabled && "table-row-status-border",
                                  isExpanded && "bg-muted/30",
                                )}
                                style={
                                  {
                                    ...(coloredShadow ? { "--row-shadow-base": statusColor } : {}),
                                    ...(statusBorderEnabled
                                      ? {
                                          "--status-border-color": statusColor,
                                          "--table-status-border-width": statusBorderWidthPx,
                                        }
                                      : {}),
                                  } as CSSProperties
                                }
                                onClick={handleRowClick}
                              >
                                {view.visibleProperties.map((property) => {
                                  const styleEntry = columnStyles[property]
                                  const { content, backgroundColor, defaultTextColor, cellClassName, statusGradient } =
                                    renderCell(intervention, property, styleEntry, themeMode)
                                  const alignment = (columnAlignment[property] ?? "center") as TableColumnAlignment
                                  const alignmentClass =
                                    alignment === "center"
                                      ? "text-center"
                                      : alignment === "right"
                                        ? "text-right"
                                        : "text-left"
                                  const typographyClasses = buildTypographyClasses(styleEntry)
                                  const textColor = styleEntry?.textColor ?? defaultTextColor
                                  const width = columnWidths[property] ?? 150 // Largeur par défaut si non définie
                                  const inlineStyle: CSSProperties & Record<string, any> = {
                                    width,
                                    minWidth: width,
                                    maxWidth: width,
                                  }
                                  if (backgroundColor) inlineStyle.backgroundColor = backgroundColor
                                  if (textColor) inlineStyle.color = textColor

                                  if (rowDisplayMode === "gradient" && statusGradient) {
                                    inlineStyle["--cell-background-layer"] = statusGradient
                                  }

                                  return (
                                    <td
                                      key={`${intervention.id}-${property}`}
                                      className={cn(
                                        "px-4 py-4 text-sm align-middle transition-colors duration-150",
                                        densityCellClass,
                                        alignmentClass,
                                        typographyClasses,
                                        cellClassName,
                                        "max-w-[200px]",
                                        isExpanded && "!py-[px]",
                                      )}
                                      style={inlineStyle}
                                    >
                                      <TruncatedCell content={content} />
                                    </td>
                                  )
                                })}
                                <td
                                  className={cn(
                                    "px-4 py-4 text-sm align-middle text-center transition-colors duration-150",
                                    densityCellClass,
                                    isExpanded && "!py-[7px]",
                                  )}
                                  style={{ width: 100, minWidth: 100, maxWidth: 100 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-center gap-0">
                                    {/* Cloche - Visible si reminder actif OU hover sur la ligne */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        "h-8 w-8 transition-opacity duration-150",
                                        reminders.has(intervention.id)
                                          ? "text-red-500 hover:text-red-600 opacity-100"
                                          : "opacity-0 group-hover:opacity-100",
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void toggleReminder(intervention.id)
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault()
                                        handleReminderContextMenu(e, intervention.id)
                                      }}
                                      title={reminders.has(intervention.id) ? "Retirer le rappel" : "Ajouter un rappel"}
                                    >
                                      <Bell className={cn("h-4 w-4", reminders.has(intervention.id) && "fill-current")} />
                                    </Button>
                                    {/* Œil - Toujours visible */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onInterventionClick?.(intervention.id, {
                                          layoutId: `table-row-${intervention.id}`,
                                          orderedIds,
                                          index: rowIndex,
                                        })
                                      }}
                                      title="Voir les détails"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="border-b-0 hover:bg-transparent">
                                  <td colSpan={view.visibleProperties.length + 1} className="p-0 align-top">
                                    <ExpandedRowContent
                                      intervention={intervention}
                                      statusColor={statusColor}
                                      showStatusBorder={statusBorderEnabled}
                                      statusBorderWidth={statusBorderWidthPx}
                                    />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}

                        {virtualItems.length > 0 && (
                          <tr
                            style={{
                              height: `${Math.max(totalHeight - virtualItems[virtualItems.length - 1].end, 0)}px`,
                            }}
                          />
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              <div
                className={cn(
                  "pointer-events-none absolute top-0 left-0 right-0 h-20 z-10",
                  "transition-opacity duration-1300",
                  showTopFade
                    ? (themeMode === "dark" ? "opacity-100" : "opacity-25")
                    : "opacity-0",
                )}
                style={{
                  background:
                    themeMode === "dark"
                      ? "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)"
                      : "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)",
                }}
              />
              <div
                className={cn(
                  "pointer-events-none absolute bottom-0 left-0 right-0 h-20 z-10",
                  "transition-opacity duration-300",
                  showBottomFade
                    ? (themeMode === "dark" ? "opacity-100" : "opacity-25")
                    : "opacity-0",
                )}
                style={{
                  background:
                    themeMode === "dark"
                      ? "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)"
                      : "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)",
                }}
              />
            </div>
          </div>
        </div>
        <style jsx>{`
          .table-scroll-wrapper::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .table-scroll-wrapper::-webkit-scrollbar-track {
            background: ${themeMode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"};
          }
          .table-scroll-wrapper::-webkit-scrollbar-thumb {
            background: ${themeMode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"};
            border-radius: 4px;
          }
          .table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
            background: ${themeMode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"};
          }
        `}</style>
      </Card>
      {quickStylePanel}

      <AlertDialog open={showNoteDialog} onOpenChange={handleNoteDialogOpenChange}>
        <NoteDialogContent
          ref={noteDialogContentRef}
          className={cn(
            "note-reminder-dialog fixed z-[60] w-[min(448px,calc(100vw-32px))] max-w-md rounded-lg border border-border bg-popover p-6 shadow-xl focus:outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-4 data-[state=closed]:slide-out-to-right-4 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
          style={{
            top: noteDialogCoords.top,
            left: noteDialogCoords.left,
          }}
          onEscapeKeyDown={() => handleNoteDialogOpenChange(false)}
        >
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>
              {noteDialogInterventionId && reminders.has(noteDialogInterventionId)
                ? "Modifier le rappel"
                : "Créer un rappel"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ajoutez une note et/ou définissez une date d'échéance. Utilisez @ pour notifier un gestionnaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Note (optionnel)</span>
              <ReminderMentionInput
                value={noteValue}
                onChange={(value, mentions) => {
                  setNoteValue(value)
                  setMentionIds(mentions)
                }}
                placeholder="Exemple: @prenom.nom relancer le client..."
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Date d'échéance (optionnel)</span>
              <DatePicker
                date={dueDateValue}
                onDateChange={setDueDateValue}
                placeholder="Sélectionner une date..."
                popoverContainer={noteDialogContentRef.current}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                handleNoteDialogOpenChange(false)
              }}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleNoteSave()
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isReminderSaveDisabled}
            >
              Enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </NoteDialogContent>
      </AlertDialog>
    </>
  )
}

export default TableView

function TruncatedCell({ content, className }: { content: ReactNode; className?: string }) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const cellRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const element = cellRef.current
    if (!element) return
    
    // Vérifier si le contenu déborde
    const checkOverflow = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth)
    }
    
    checkOverflow()
    
    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(element)
    
    return () => resizeObserver.disconnect()
  }, [content])

  const contentStr = typeof content === "string" ? content : 
                     typeof content === "number" ? String(content) : ""

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!isOverflowing) return
    const rect = cellRef.current?.getBoundingClientRect()
    if (rect) {
      setTooltipPos({
        x: rect.left,
        y: rect.bottom + 8
      })
    }
  }

  const handleMouseLeave = () => {
    setTooltipPos(null)
  }

  return (
    <>
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={cellRef}
          className={cn(
            "truncate relative",
            className
          )}
        >
          {content}
        </div>
      </div>
      {tooltipPos && contentStr && (
        <div 
          className="fixed z-[1000] p-3 bg-card text-card-foreground border-2 border-border rounded-lg shadow-2xl max-w-sm whitespace-normal break-words text-sm font-normal pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          {contentStr}
        </div>
      )}
    </>
  )
}

function ExpandedRowContent({ 
  intervention,
  statusColor,
  showStatusBorder,
  statusBorderWidth,
}: { 
  intervention: InterventionEntity
  statusColor: string
  showStatusBorder: boolean
  statusBorderWidth: string
}) {
  const [newComment, setNewComment] = useState("")

  // Récupération des données de l'intervention avec useMemo pour réactivité
  const interventionData = useMemo(() => {
    const intervAny = intervention as any
    return {
      contexte: intervAny.contexteIntervention || "—",
      consigne: intervAny.consigneIntervention || "—",
      coutSST: intervAny.coutSST,
      adresse: intervAny.adresse || "—",
      ville: intervAny.ville || "",
      codePostal: intervAny.codePostal || "",
      prenomClient: intervAny.prenomClient || "",
      nomClient: intervAny.nomClient || "",
      telephoneClient: intervAny.telephoneClient || "—",
      telephone2Client: intervAny.telephone2Client || "",
      agenceName: intervAny.agenceLabel || intervAny.agence || intervAny.agency || "",
      referenceAgence: intervAny.referenceAgence || intervAny.reference_agence || "",
    }
  }, [intervention])

  const agencesRequiringRef = useMemo(() => ["ImoDirect", "AFEDIM", "Oqoro"], [])
  const showReferenceAgence = useMemo(
    () => agencesRequiringRef.includes(interventionData.agenceName),
    [interventionData.agenceName, agencesRequiringRef]
  )

  const handleSubmitComment = () => {
    if (!newComment.trim()) return
    // TODO: Implémenter l'ajout du commentaire via l'API
    console.log("Nouveau commentaire:", newComment)
    setNewComment("")
  }

  return (
    <div 
      className={cn(
        "w-[100%] bg-accent/10 dark:bg-accent/15 p-2",
        showStatusBorder && "border-l"
      )}
        style={{
          ...(showStatusBorder ? {
            borderLeftColor: statusColor,
            borderLeftWidth: statusBorderWidth,
          } : {}),
          transform: "translate(-26px, -14px) scale(1.022)",
          transformOrigin: "top left",
          paddingTop: "20px",
          paddingBottom: "-10px",
        }}
      >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Colonne 1 - Informations Générales */}
        <div className="space-y-1">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Contexte</p>
            <p className="text-sm">{interventionData.contexte}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Consigne</p>
            <p className="text-sm">{interventionData.consigne}</p>
          </div>
          {interventionData.coutSST != null && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Coût Artisan</p>
              <p className="text-sm font-medium">{numberFormatter.format(interventionData.coutSST)} €</p>
            </div>
          )}
        </div>

        {/* Colonne 2 - Informations Client */}
        <div className="space-y-3">
          {showReferenceAgence && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Référence agence</p>
              <p className="text-sm">{interventionData.referenceAgence || "—"}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Adresse</p>
            <p className="text-sm">
              {interventionData.adresse}
              {(interventionData.ville || interventionData.codePostal) && (
                <>
                  <br />
                  {interventionData.codePostal} {interventionData.ville}
                </>
              )}
            </p>
          </div>
          {(interventionData.prenomClient || interventionData.nomClient) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Client</p>
              <p className="text-sm">
                {interventionData.prenomClient} {interventionData.nomClient}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Téléphone</p>
            <p className="text-sm">
              {interventionData.telephoneClient}
              {interventionData.telephone2Client && (
                <>
                  {" | "}
                  {interventionData.telephone2Client}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Colonne 3 - Commentaires */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Commentaires</p>
            <ScrollArea className="h-[100px] rounded-md border bg-background/50 p-2">
              <div className="space-y-2 text-xs">
                {/* TODO: Afficher l'historique des commentaires */}
                <p className="text-muted-foreground italic">Aucun commentaire pour le moment</p>
              </div>
            </ScrollArea>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ajouter un commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmitComment()
                }
              }}
              className="flex-1 text-sm"
            />
            <Button
              size="icon"
              variant="default"
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
              className="shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

type FilterOption = {
  key: string
  value: unknown
  label: string
}

const makeValueKey = (value: unknown) => {
  if (value === undefined) return "undefined"
  if (value === null) return "null"
  if (value instanceof Date) return `date:${value.toISOString()}`
  if (typeof value === "object") {
    try {
      return `object:${JSON.stringify(value)}`
    } catch {
      return `object:${String(value)}`
    }
  }
  return `${typeof value}:${String(value)}`
}

const formatFilterLabel = (value: unknown, schema?: PropertySchema): string => {
  if (value === null || value === undefined || value === "") {
    return "—"
  }

  switch (schema?.type) {
    case "date": {
      const date = new Date(String(value))
      return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date)
    }
    case "number":
      return typeof value === "number" ? numberFormatter.format(value) : numberFormatter.format(Number(value))
    case "checkbox":
      return value ? "Oui" : "Non"
    case "select":
    case "multi_select": {
      const option = schema?.options?.find((opt) => opt.value === value)
      return option?.label ?? String(value)
    }
    default:
      return String(value)
  }
}

const buildFilterOptions = (
  items: InterventionEntity[],
  property: string,
  schema?: PropertySchema,
  activeFilter?: ViewFilter,
): FilterOption[] => {
  const seen = new Map<string, FilterOption>()

  const addCandidate = (raw: unknown) => {
    const key = makeValueKey(raw)
    if (seen.has(key)) return
    seen.set(key, {
      key,
      value: raw,
      label: formatFilterLabel(raw, schema),
    })
  }

  if (schema?.type === "select" || schema?.type === "multi_select") {
    schema.options?.forEach((option) => addCandidate(option.value))
  }

  if (schema?.type === "checkbox") {
    addCandidate(true)
    addCandidate(false)
  }

  items.forEach((item) => {
    const value = getPropertyValue(item, property)
    if (Array.isArray(value)) {
      value.forEach(addCandidate)
      return
    }
    if (value !== null && value !== undefined && value !== "") {
      addCandidate(value)
    }
  })

  if (activeFilter) {
    if (activeFilter.operator === "eq" && activeFilter.value !== undefined) {
      addCandidate(activeFilter.value)
    }
    if (activeFilter.operator === "in" && Array.isArray(activeFilter.value)) {
      activeFilter.value.forEach(addCandidate)
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "fr", { sensitivity: "base" }),
  )
}

const deriveSelectedKeys = (filter?: ViewFilter): Set<string> => {
  if (!filter) return new Set()
  if (filter.operator === "eq" && filter.value !== undefined) {
    return new Set([makeValueKey(filter.value)])
  }
  if (filter.operator === "in" && Array.isArray(filter.value)) {
    return new Set(filter.value.map((value) => makeValueKey(value)))
  }
  return new Set()
}

const selectionEligibleTypes = new Set<PropertySchema["type"]>(["select", "multi_select", "checkbox", "user"])

type AdvancedValueInputConfig =
  | { kind: "none" }
  | { kind: "text" }
  | { kind: "number" }
  | { kind: "date" }
  | { kind: "boolean" }
  | { kind: "options_single" }
  | { kind: "options_multi" }
  | { kind: "range_number" }
  | { kind: "range_date" }

type AdvancedOperatorConfig = {
  operator: ViewFilter["operator"]
  label: string
  value: AdvancedValueInputConfig
}

const getOperatorConfigs = (schema: PropertySchema, hasOptions: boolean): AdvancedOperatorConfig[] => {
  switch (schema.type) {
    case "number":
      return [
        { operator: "eq", label: "Est égal à", value: { kind: "number" } },
        { operator: "neq", label: "Différent de", value: { kind: "number" } },
        { operator: "gt", label: "Supérieur à", value: { kind: "number" } },
        { operator: "gte", label: "Supérieur ou égal à", value: { kind: "number" } },
        { operator: "lt", label: "Inférieur à", value: { kind: "number" } },
        { operator: "lte", label: "Inférieur ou égal à", value: { kind: "number" } },
        { operator: "between", label: "Entre (inclus)", value: { kind: "range_number" } },
        { operator: "is_empty", label: "Est vide", value: { kind: "none" } },
        { operator: "is_not_empty", label: "N'est pas vide", value: { kind: "none" } },
      ]
    case "date":
      return [
        { operator: "eq", label: "Est le", value: { kind: "date" } },
        { operator: "gt", label: "Après", value: { kind: "date" } },
        { operator: "gte", label: "Après ou le", value: { kind: "date" } },
        { operator: "lt", label: "Avant", value: { kind: "date" } },
        { operator: "lte", label: "Avant ou le", value: { kind: "date" } },
        { operator: "between", label: "Entre (inclus)", value: { kind: "range_date" } },
        { operator: "is_empty", label: "Est vide", value: { kind: "none" } },
        { operator: "is_not_empty", label: "N'est pas vide", value: { kind: "none" } },
      ]
    case "checkbox":
      return [
        { operator: "eq", label: "Est", value: { kind: "boolean" } },
        { operator: "neq", label: "N'est pas", value: { kind: "boolean" } },
        { operator: "is_empty", label: "Est vide", value: { kind: "none" } },
        { operator: "is_not_empty", label: "N'est pas vide", value: { kind: "none" } },
      ]
    case "select":
    case "multi_select":
    case "user":
      if (hasOptions) {
        return [
          { operator: "eq", label: "Est", value: { kind: "options_single" } },
          { operator: "neq", label: "N'est pas", value: { kind: "options_single" } },
          { operator: "in", label: "Est dans", value: { kind: "options_multi" } },
          { operator: "not_in", label: "N'est pas dans", value: { kind: "options_multi" } },
          { operator: "is_empty", label: "Est vide", value: { kind: "none" } },
          { operator: "is_not_empty", label: "N'est pas vide", value: { kind: "none" } },
        ]
      }
      return [
        { operator: "contains", label: "Contient", value: { kind: "text" } },
        { operator: "not_contains", label: "Ne contient pas", value: { kind: "text" } },
        { operator: "eq", label: "Est", value: { kind: "text" } },
        { operator: "neq", label: "N'est pas", value: { kind: "text" } },
        { operator: "is_empty", label: "Est vide", value: { kind: "none" } },
        { operator: "is_not_empty", label: "N'est pas vide", value: { kind: "none" } },
      ]
    default:
      return [
        { operator: "contains", label: "Contient", value: { kind: "text" } },
        { operator: "not_contains", label: "Ne contient pas", value: { kind: "text" } },
        { operator: "eq", label: "Est exactement", value: { kind: "text" } },
        { operator: "neq", label: "N'est pas exactement", value: { kind: "text" } },
        { operator: "is_empty", label: "Est vide", value: { kind: "none" } },
        { operator: "is_not_empty", label: "N'est pas vide", value: { kind: "none" } },
      ]
  }
}

const isSelectionFriendlyOperator = (schema: PropertySchema, operator: ViewFilter["operator"]) => {
  if (operator !== "eq" && operator !== "in") return false
  return selectionEligibleTypes.has(schema.type)
}

const getInitialMode = (
  schema: PropertySchema,
  filter: ViewFilter | undefined,
  hasSelectionOptions: boolean,
): "selection" | "advanced" => {
  if (filter && isSelectionFriendlyOperator(schema, filter.operator)) {
    return "selection"
  }
  if (filter) return "advanced"
  if (selectionEligibleTypes.has(schema.type) && hasSelectionOptions) return "selection"
  return schema.type === "checkbox" ? "selection" : "advanced"
}

type AdvancedStateSnapshot = {
  text: string
  number: string
  date: string
  rangeNumber: { from: string; to: string }
  rangeDate: { from: string; to: string }
  singleOptionKey: string | null
  multiOptionKeys: Set<string>
  booleanValue: "" | "true" | "false"
}

const toDateInputValue = (value: unknown): string => {
  const date = toDate(value)
  if (!date) return ""
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0")
  const day = `${date.getUTCDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const createEmptyAdvancedState = (): AdvancedStateSnapshot => ({
  text: "",
  number: "",
  date: "",
  rangeNumber: { from: "", to: "" },
  rangeDate: { from: "", to: "" },
  singleOptionKey: null,
  multiOptionKeys: new Set<string>(),
  booleanValue: "",
})

const readRangeValue = (raw: ViewFilter["value"]) => {
  if (Array.isArray(raw)) {
    return {
      from: raw[0],
      to: raw[1],
    }
  }
  if (raw && typeof raw === "object") {
    const lookup = raw as { from?: unknown; to?: unknown }
    return {
      from: lookup.from,
      to: lookup.to,
    }
  }
  return {
    from: undefined,
    to: undefined,
  }
}

const buildInitialAdvancedState = (
  schema: PropertySchema,
  filter: ViewFilter | undefined,
  options: FilterOption[],
): AdvancedStateSnapshot => {
  if (!filter) return createEmptyAdvancedState()
  const optionKeys = new Set(options.map((option) => option.key))
  const next = createEmptyAdvancedState()

  switch (filter.operator) {
    case "between": {
      const { from, to } = readRangeValue(filter.value)
      if (schema.type === "date") {
        next.rangeDate = {
          from: toDateInputValue(from),
          to: toDateInputValue(to),
        }
      } else {
        next.rangeNumber = {
          from: from == null ? "" : String(from),
          to: to == null ? "" : String(to),
        }
      }
      break
    }
    case "in":
    case "not_in":
      if (Array.isArray(filter.value)) {
        const keys = filter.value
          .map((value) => makeValueKey(value))
          .filter((key) => optionKeys.has(key))
        next.multiOptionKeys = new Set(keys)
      }
      break
    case "eq":
    case "neq": {
      if (schema.type === "checkbox") {
        if (filter.value === true) next.booleanValue = "true"
        if (filter.value === false) next.booleanValue = "false"
        break
      }
      if (schema.type === "date") {
        next.date = toDateInputValue(filter.value)
        break
      }
      if (schema.type === "number") {
        next.number = filter.value == null ? "" : String(filter.value)
        break
      }
      const key = makeValueKey(filter.value)
      if (optionKeys.has(key)) {
        next.singleOptionKey = key
      } else {
        next.text = filter.value == null ? "" : String(filter.value)
      }
      break
    }
    case "contains":
    case "not_contains":
      next.text = filter.value == null ? "" : String(filter.value)
      break
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      if (schema.type === "date") {
        next.date = toDateInputValue(filter.value)
      } else if (schema.type === "number") {
        next.number = filter.value == null ? "" : String(filter.value)
      } else {
        next.text = filter.value == null ? "" : String(filter.value)
      }
      break
    default:
      break
  }

  return next
}

const toPrimitiveFilterValue = (value: unknown): string | number | boolean | undefined => {
  if (value === null || value === undefined) return undefined
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return String(value)
}

function ColumnFilterTrigger({
  property,
  schema,
  activeFilter,
  interventions,
  loadDistinctValues,
  onFilterChange,
}: {
  property: string
  schema: PropertySchema
  activeFilter?: ViewFilter
  interventions: InterventionEntity[]
  loadDistinctValues?: (property: string) => Promise<string[]>
  onFilterChange: (property: string, filter: ViewFilter | null) => void
}) {
  const [open, setOpen] = useState(false)
  const baseOptions = useMemo(
    () => buildFilterOptions(interventions, property, schema, activeFilter),
    [interventions, property, schema, activeFilter],
  )
  const [remoteOptions, setRemoteOptions] = useState<FilterOption[] | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [hasFetchedOptions, setHasFetchedOptions] = useState(false)

  useEffect(() => {
    setRemoteOptions(null)
    setHasFetchedOptions(false)
  }, [property])

  useEffect(() => {
    if (!open || !loadDistinctValues || hasFetchedOptions) return
    let cancelled = false
    setIsLoadingOptions(true)
    loadDistinctValues(property)
      .then((values) => {
        if (cancelled || !Array.isArray(values)) return
        const unique = new Map<string, FilterOption>()
        values.forEach((raw) => {
          if (raw == null || raw === "") return
          const key = makeValueKey(raw)
          if (unique.has(key)) return
          unique.set(key, {
            key,
            value: raw,
            label: formatFilterLabel(raw, schema),
          })
        })
        setRemoteOptions(Array.from(unique.values()))
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteOptions(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingOptions(false)
          setHasFetchedOptions(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, loadDistinctValues, property, schema, hasFetchedOptions])

  const options = useMemo(() => {
    if (!remoteOptions) {
      return baseOptions
    }
    const unique = new Map<string, FilterOption>()
    remoteOptions.forEach((option) => unique.set(option.key, option))
    baseOptions.forEach((option) => {
      if (!unique.has(option.key)) {
        unique.set(option.key, option)
      }
    })
    return Array.from(unique.values())
  }, [baseOptions, remoteOptions])

  const valueMap = useMemo(() => {
    const map = new Map<string, unknown>()
    options.forEach((option) => map.set(option.key, option.value))
    return map
  }, [options])

  const selectedKeys = useMemo(() => deriveSelectedKeys(activeFilter), [activeFilter])
  const hasActiveFilter = Boolean(activeFilter)
  const canUseSelection = schema.type === "checkbox" || options.length > 0 || isLoadingOptions
  const label = getPropertyLabel(property)
  const initialMode = useMemo(
    () => getInitialMode(schema, activeFilter, canUseSelection),
    [schema, activeFilter, canUseSelection],
  )
  const [mode, setMode] = useState<"selection" | "advanced">(initialMode)
  useEffect(() => {
    if (!open) {
      setMode(initialMode)
    }
  }, [initialMode, open])

  const operatorConfigs = useMemo(
    () => getOperatorConfigs(schema, options.length > 0),
    [schema, options],
  )
  const initialAdvancedOperator = useMemo<ViewFilter["operator"]>(() => {
    if (activeFilter) {
      const match = operatorConfigs.find((config) => config.operator === activeFilter.operator)
      if (match) return match.operator
    }
    return operatorConfigs[0]?.operator ?? "eq"
  }, [operatorConfigs, activeFilter])

  const initialAdvancedState = useMemo(
    () => buildInitialAdvancedState(schema, activeFilter, options),
    [schema, activeFilter, options],
  )
  const [advancedOperator, setAdvancedOperator] = useState<ViewFilter["operator"]>(initialAdvancedOperator)
  const [advancedText, setAdvancedText] = useState(initialAdvancedState.text)
  const [advancedNumber, setAdvancedNumber] = useState(initialAdvancedState.number)
  const [advancedDate, setAdvancedDate] = useState(initialAdvancedState.date)
  const [advancedRangeNumber, setAdvancedRangeNumber] = useState(initialAdvancedState.rangeNumber)
  const [advancedRangeDate, setAdvancedRangeDate] = useState(initialAdvancedState.rangeDate)
  const [advancedSingleKey, setAdvancedSingleKey] = useState<string | null>(initialAdvancedState.singleOptionKey)
  const [advancedMultiKeys, setAdvancedMultiKeys] = useState<Set<string>>(
    () => new Set(initialAdvancedState.multiOptionKeys),
  )
  const [advancedBoolean, setAdvancedBoolean] = useState<string>(initialAdvancedState.booleanValue)
  const [advancedError, setAdvancedError] = useState<string | null>(null)

  useEffect(() => {
    setAdvancedOperator(initialAdvancedOperator)
    setAdvancedText(initialAdvancedState.text)
    setAdvancedNumber(initialAdvancedState.number)
    setAdvancedDate(initialAdvancedState.date)
    setAdvancedRangeNumber({ ...initialAdvancedState.rangeNumber })
    setAdvancedRangeDate({ ...initialAdvancedState.rangeDate })
    setAdvancedSingleKey(initialAdvancedState.singleOptionKey)
    setAdvancedMultiKeys(new Set(initialAdvancedState.multiOptionKeys))
    setAdvancedBoolean(initialAdvancedState.booleanValue)
    setAdvancedError(null)
  }, [initialAdvancedOperator, initialAdvancedState])

  const handleToggleKey = useCallback(
    (key: string, checked: boolean) => {
      const nextKeys = new Set(selectedKeys)
      if (checked) {
        nextKeys.add(key)
      } else {
        nextKeys.delete(key)
      }

      const values = Array.from(nextKeys)
        .map((item) => toPrimitiveFilterValue(valueMap.get(item)))
        .filter((item): item is string | number | boolean => item !== undefined)

      if (values.length === 0) {
        onFilterChange(property, null)
        return
      }

      if (values.length === 1) {
        onFilterChange(property, { property, operator: "eq", value: values[0] })
        return
      }

      onFilterChange(property, { property, operator: "in", value: values })
    },
    [selectedKeys, valueMap, onFilterChange, property],
  )

  const handleReset = useCallback(() => {
    setAdvancedError(null)
    onFilterChange(property, null)
  }, [onFilterChange, property])

  const handleModeChange = useCallback((next: string) => {
    setMode(next as "selection" | "advanced")
    setAdvancedError(null)
  }, [])

  const handleAdvancedOperatorChange = useCallback((next: string) => {
    setAdvancedOperator(next as ViewFilter["operator"])
    setAdvancedError(null)
  }, [])

  const handleAdvancedTextChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAdvancedText(event.target.value)
    setAdvancedError(null)
  }, [])

  const handleAdvancedNumberChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAdvancedNumber(event.target.value)
    setAdvancedError(null)
  }, [])

  const handleAdvancedDateChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAdvancedDate(event.target.value)
    setAdvancedError(null)
  }, [])

  const handleRangeNumberChange = useCallback(
    (key: "from" | "to") => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setAdvancedRangeNumber((prev) => ({ ...prev, [key]: value }))
      setAdvancedError(null)
    },
    [],
  )

  const handleRangeDateChange = useCallback(
    (key: "from" | "to") => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setAdvancedRangeDate((prev) => ({ ...prev, [key]: value }))
      setAdvancedError(null)
    },
    [],
  )

  const handleAdvancedBooleanChange = useCallback((value: string) => {
    setAdvancedBoolean(value)
    setAdvancedError(null)
  }, [])

  const handleSingleOptionChange = useCallback((value: string) => {
    setAdvancedSingleKey(value)
    setAdvancedError(null)
  }, [])

  const toggleAdvancedMultiKey = useCallback((key: string, checked: boolean) => {
    setAdvancedMultiKeys((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
    setAdvancedError(null)
  }, [])

  const handleApplyAdvanced = useCallback(() => {
    const config = operatorConfigs.find((candidate) => candidate.operator === advancedOperator) ?? operatorConfigs[0]
    if (!config) return

    const operator = config.operator
    let nextFilter: ViewFilter | null = null

    switch (config.value.kind) {
      case "none":
        nextFilter = { property, operator }
        break
      case "text": {
        const raw = advancedText.trim()
        if (!raw) {
          setAdvancedError("Veuillez saisir une valeur.")
          return
        }
        nextFilter = { property, operator, value: raw }
        break
      }
      case "number": {
        const raw = advancedNumber.trim()
        if (!raw) {
          setAdvancedError("Veuillez saisir un nombre.")
          return
        }
        const parsed = Number(raw)
        if (Number.isNaN(parsed)) {
          setAdvancedError("Valeur numérique invalide.")
          return
        }
        nextFilter = { property, operator, value: parsed }
        break
      }
      case "date": {
        if (!advancedDate) {
          setAdvancedError("Veuillez choisir une date.")
          return
        }
        const date = new Date(advancedDate)
        if (Number.isNaN(date.getTime())) {
          setAdvancedError("Date invalide.")
          return
        }
        nextFilter = { property, operator, value: date.toISOString() }
        break
      }
      case "boolean": {
        if (!advancedBoolean) {
          setAdvancedError("Sélectionnez une valeur.")
          return
        }
        nextFilter = { property, operator, value: advancedBoolean === "true" }
        break
      }
      case "options_single": {
        if (!advancedSingleKey) {
          setAdvancedError("Sélectionnez une valeur.")
          return
        }
        if (!valueMap.has(advancedSingleKey)) {
          setAdvancedError("Valeur inconnue.")
          return
        }
        const primitive = toPrimitiveFilterValue(valueMap.get(advancedSingleKey))
        if (primitive === undefined) {
          setAdvancedError("Valeur inconnue.")
          return
        }
        nextFilter = { property, operator, value: primitive }
        break
      }
      case "options_multi": {
        if (advancedMultiKeys.size === 0) {
          setAdvancedError("Sélectionnez au moins une valeur.")
          return
        }
        const values = Array.from(advancedMultiKeys)
          .map((key) => toPrimitiveFilterValue(valueMap.get(key)))
          .filter((value): value is string | number | boolean => value !== undefined)
        if (!values.length) {
          setAdvancedError("Sélection invalide.")
          return
        }
        nextFilter = { property, operator, value: values }
        break
      }
      case "range_number": {
        const fromRaw = advancedRangeNumber.from.trim()
        const toRaw = advancedRangeNumber.to.trim()
        if (!fromRaw && !toRaw) {
          setAdvancedError("Renseignez au moins une borne.")
          return
        }
        const fromValue = fromRaw ? Number(fromRaw) : undefined
        const toValue = toRaw ? Number(toRaw) : undefined
        if ((fromRaw && Number.isNaN(fromValue)) || (toRaw && Number.isNaN(toValue))) {
          setAdvancedError("Borne numérique invalide.")
          return
        }
        nextFilter = {
          property,
          operator,
          value: {
            from: fromValue,
            to: toValue,
          },
        }
        break
      }
      case "range_date": {
        const fromRaw = advancedRangeDate.from
        const toRaw = advancedRangeDate.to
        if (!fromRaw && !toRaw) {
          setAdvancedError("Renseignez au moins une date.")
          return
        }
        const fromDate = fromRaw ? new Date(fromRaw) : null
        const toDateValue = toRaw ? new Date(toRaw) : null
        if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDateValue && Number.isNaN(toDateValue.getTime()))) {
          setAdvancedError("Date invalide.")
          return
        }
        nextFilter = {
          property,
          operator,
          value: {
            from: fromDate ? fromDate.toISOString() : undefined,
            to: toDateValue ? toDateValue.toISOString() : undefined,
          },
        }
        break
      }
      default:
        break
    }

    if (!nextFilter) {
      setAdvancedError("Impossible de construire le filtre.")
      return
    }

    onFilterChange(property, nextFilter)
    setOpen(false)
  }, [
    advancedBoolean,
    advancedDate,
    advancedMultiKeys,
    advancedNumber,
    advancedOperator,
    advancedRangeDate,
    advancedRangeNumber,
    advancedSingleKey,
    advancedText,
    onFilterChange,
    operatorConfigs,
    property,
    valueMap,
  ])

  const advancedFilterActive =
    hasActiveFilter && activeFilter ? !isSelectionFriendlyOperator(schema, activeFilter.operator) : false

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedKeys.has(option.key)),
    [options, selectedKeys],
  )

  const selectionSummary = useMemo(() => {
    if (isLoadingOptions && options.length === 0) {
      return "Chargement…"
    }
    if (selectedOptions.length === 0) {
      return "Choisir…"
    }
    if (selectedOptions.length <= 2) {
      return selectedOptions.map((option) => option.label).join(", ")
    }
    const [first, second] = selectedOptions
    return `${first.label}, ${second.label} (+${selectedOptions.length - 2})`
  }, [isLoadingOptions, options.length, selectedOptions])

  const handleClearSelection = useCallback(() => {
    onFilterChange(property, null)
  }, [onFilterChange, property])

  const selectionContent = canUseSelection ? (
    <>
      {advancedFilterActive ? (
        <div className="mb-2 rounded-md border border-amber-500/50 bg-amber-400/10 p-2 text-xs text-amber-900 dark:text-amber-200">
          Un filtre avancé est actif. Utiliser la sélection remplacera la condition actuelle.
        </div>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between gap-2 text-xs font-medium"
            disabled={isLoadingOptions && options.length === 0}
          >
            <span className="truncate">{selectionSummary}</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-64 w-[260px] overflow-y-auto">
          {isLoadingOptions ? (
            <div className="px-2 py-1 text-xs text-muted-foreground">Chargement des valeurs…</div>
          ) : null}
          {!isLoadingOptions && options.length === 0 ? (
            <div className="px-2 py-1 text-xs text-muted-foreground">Aucune donnée disponible</div>
          ) : null}
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.key}
              checked={selectedKeys.has(option.key)}
              onCheckedChange={(checked) => handleToggleKey(option.key, Boolean(checked))}
              className="text-sm"
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedOptions.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {selectedOptions.map((option) => (
            <Badge key={option.key} variant="secondary" className="flex items-center gap-1">
              <span>{option.label}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-secondary-foreground/10"
                onClick={() => handleToggleKey(option.key, false)}
                aria-label={`Retirer ${option.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="link" size="sm" className="h-auto px-1 text-xs" onClick={handleClearSelection}>
            Effacer
          </Button>
        </div>
      ) : null}
    </>
  ) : (
    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      Aucune valeur disponible pour la sélection rapide.
    </div>
  )

  const currentAdvancedConfig =
    operatorConfigs.find((config) => config.operator === advancedOperator) ?? operatorConfigs[0]

  const renderAdvancedValueInput = () => {
    if (!currentAdvancedConfig) return null
    switch (currentAdvancedConfig.value.kind) {
      case "text":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valeur</p>
            <Input value={advancedText} onChange={handleAdvancedTextChange} placeholder="Saisir une valeur" />
          </div>
        )
      case "number":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valeur numérique</p>
            <Input
              type="number"
              value={advancedNumber}
              onChange={handleAdvancedNumberChange}
              placeholder="Ex. 42"
            />
          </div>
        )
      case "date":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p>
            <Input type="date" value={advancedDate} onChange={handleAdvancedDateChange} />
          </div>
        )
      case "boolean":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valeur</p>
            <Select value={advancedBoolean || undefined} onValueChange={handleAdvancedBooleanChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Choisir une valeur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Oui</SelectItem>
                <SelectItem value="false">Non</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      case "options_single":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valeur</p>
            <Select value={advancedSingleKey ?? undefined} onValueChange={handleSingleOptionChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Choisir une valeur" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case "options_multi":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valeurs</p>
            <ScrollArea className="max-h-48 rounded-md border border-border/40">
              <div className="space-y-1 p-1">
                {options.map((option) => (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/70"
                  >
                    <Checkbox
                      checked={advancedMultiKeys.has(option.key)}
                      onCheckedChange={(checked) => toggleAdvancedMultiKey(option.key, Boolean(checked))}
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                ))}
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </div>
        )
      case "range_number":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bornes numériques
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={advancedRangeNumber.from}
                onChange={handleRangeNumberChange("from")}
                placeholder="Min"
              />
              <span className="text-xs text-muted-foreground">à</span>
              <Input
                type="number"
                value={advancedRangeNumber.to}
                onChange={handleRangeNumberChange("to")}
                placeholder="Max"
              />
            </div>
          </div>
        )
      case "range_date":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Période</p>
            <div className="flex items-center gap-2">
              <Input type="date" value={advancedRangeDate.from} onChange={handleRangeDateChange("from")} />
              <span className="text-xs text-muted-foreground">au</span>
              <Input type="date" value={advancedRangeDate.to} onChange={handleRangeDateChange("to")} />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            hasActiveFilter ? "bg-primary/10 text-primary" : "hover:bg-muted/80",
          )}
        >
          <span className="truncate">{label}</span>
          <span className="ml-auto flex items-center gap-0.5 text-muted-foreground">
            {hasActiveFilter ? <Filter className="h-3.5 w-3.5" /> : null}
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="w-72">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-foreground">Filtrer par {label}</div>
          <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="selection" disabled={!canUseSelection}>
                Sélection
              </TabsTrigger>
              <TabsTrigger value="advanced">Filtre</TabsTrigger>
            </TabsList>
            <TabsContent value="selection" className="mt-3 space-y-2 focus-visible:outline-none">
              {selectionContent}
            </TabsContent>
            <TabsContent value="advanced" className="mt-3 space-y-3 focus-visible:outline-none">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Condition</p>
                <Select value={advancedOperator} onValueChange={handleAdvancedOperatorChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operatorConfigs.map((config) => (
                      <SelectItem key={config.operator} value={config.operator}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {renderAdvancedValueInput()}
              {advancedError ? <p className="text-xs text-destructive">{advancedError}</p> : null}
              <div className="flex justify-end">
                <Button size="sm" onClick={handleApplyAdvanced}>
                  Appliquer
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!hasActiveFilter}
              className={cn("text-destructive", !hasActiveFilter && "text-muted-foreground")}
            >
              Effacer le filtre
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
