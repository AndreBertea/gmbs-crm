"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value)
}

function formatPercentage(value: number) {
  return `${value}%`
}

export interface EditableCellProps {
  value: number
  onChange?: (value: number) => void
  type?: "currency" | "percentage" | "number"
  min?: number
  max?: number
  className?: string
}

export function EditableCell({ value, onChange, type = "number", min, max, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [inputValue, setInputValue] = React.useState<string>(value?.toString() ?? "0")
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else {
      setInputValue(value?.toString() ?? "0")
    }
  }, [isEditing, value])

  const commitChange = () => {
    const numeric = parseFloat(inputValue.replace(/[^0-9.-]/g, ""))
    if (!Number.isFinite(numeric)) {
      setInputValue(value?.toString() ?? "0")
      setIsEditing(false)
      return
    }
    let next = numeric
    if (typeof min === "number") next = Math.max(next, min)
    if (typeof max === "number") next = Math.min(next, max)
    onChange?.(next)
    setIsEditing(false)
  }

  const displayValue = React.useMemo(() => {
    if (!Number.isFinite(value)) return "—"
    switch (type) {
      case "currency":
        return formatCurrency(value)
      case "percentage":
        return formatPercentage(value)
      default:
        return `${value}`
    }
  }, [type, value])

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        value={inputValue}
        min={min}
        max={max}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={commitChange}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commitChange()
          }
          if (event.key === "Escape") {
            event.preventDefault()
            setInputValue(value?.toString() ?? "0")
            setIsEditing(false)
          }
        }}
        className={cn("h-8 text-sm", className)}
      />
    )
  }

  return (
    <button
      type="button"
      className={cn(
        "w-full rounded border border-transparent px-2 py-1 text-left text-sm font-medium transition-colors",
        "hover:border-border hover:bg-muted/60",
        className,
      )}
      onClick={() => setIsEditing(true)}
    >
      {displayValue}
    </button>
  )
}
