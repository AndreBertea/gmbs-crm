"use client"

import { motion } from "framer-motion"
import type { WorkflowStatus, WorkflowTransition } from "@/types/intervention-workflow"
import { cn } from "@/lib/utils"

export type TransitionArrowProps = {
  transition: WorkflowTransition
  fromStatus?: WorkflowStatus
  toStatus?: WorkflowStatus
  fromPosition?: { x: number; y: number }
  toPosition?: { x: number; y: number }
  isSelected?: boolean
  onSelect?: (transitionId: string) => void
}

const ARROW_COLOR = "#94a3b8"
const ARROW_SELECTED_COLOR = "#6366f1"

export function TransitionArrow({
  transition,
  fromPosition,
  toPosition,
  isSelected = false,
  onSelect,
}: TransitionArrowProps) {
  if (!fromPosition || !toPosition) return null

  const midX = (fromPosition.x + toPosition.x) / 2
  const midY = (fromPosition.y + toPosition.y) / 2

  const path = `M ${fromPosition.x} ${fromPosition.y} C ${midX} ${fromPosition.y}, ${midX} ${toPosition.y}, ${toPosition.x} ${toPosition.y}`
  const stroke = isSelected ? ARROW_SELECTED_COLOR : ARROW_COLOR

  return (
    <g
      className={cn(
        "cursor-pointer transition",
        isSelected && "drop-shadow-[0_0_6px_rgba(99,102,241,0.55)]",
      )}
      style={{ pointerEvents: "auto" }}
      onClick={() => onSelect?.(transition.id)}
    >
      <motion.path
        d={path}
        fill="transparent"
        stroke={stroke}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={transition.isActive ? "" : "6 6"}
        initial={false}
        animate={{ stroke }}
      />
      <motion.circle
        cx={toPosition.x}
        cy={toPosition.y}
        r={5}
        fill={stroke}
        initial={false}
        animate={{ fill: stroke }}
      />
      <text
        x={midX}
        y={midY - 6}
        className="fill-muted-foreground text-[11px]"
        textAnchor="middle"
      >
        {transition.label}
      </text>
    </g>
  )
}

export default TransitionArrow
