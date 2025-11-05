"use client"

import { useMemo, useRef, useState } from "react"
import { LayoutGroup, motion, type PanInfo } from "framer-motion"
import { Plus, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WorkflowConfig, WorkflowStatus } from "@/types/intervention-workflow"
import { StatusNode } from "@/components/interventions/StatusNode"
import { TransitionArrow } from "@/components/interventions/TransitionArrow"

const GRID_WIDTH = 200
const GRID_HEIGHT = 150
const NODE_WIDTH = 160
const NODE_HEIGHT = 110

const statusId = (status: WorkflowStatus) => status.id

const getStatusPosition = (status: WorkflowStatus, orientation: "horizontal" | "vertical") => {
  if (orientation === "horizontal") {
    return {
      left: (status.position.y - 1) * GRID_WIDTH,
      top: (status.position.x - 1) * GRID_HEIGHT,
    }
  }
  return {
    left: (status.position.x - 1) * GRID_WIDTH,
    top: (status.position.y - 1) * GRID_HEIGHT,
  }
}

const getStatusCenter = (status: WorkflowStatus, orientation: "horizontal" | "vertical") => {
  const { left, top } = getStatusPosition(status, orientation)
  return {
    x: left + NODE_WIDTH / 2,
    y: top + NODE_HEIGHT / 2,
  }
}

type WorkflowVisualizerProps = {
  workflow: WorkflowConfig
  selectedStatusId: string | null
  selectedTransitionId: string | null
  onSelectStatus: (statusId: string | null) => void
  onSelectTransition: (transitionId: string | null) => void
  onStatusPositionChange: (statusId: string, position: { x: number; y: number }) => void
  onAddStatus: () => void
  onAddTransition: () => void
  onSave: () => void
  onRemoveStatus: (statusId: string) => void
}

export function WorkflowVisualizer({
  workflow,
  selectedStatusId,
  selectedTransitionId,
  onSelectStatus,
  onSelectTransition,
  onStatusPositionChange,
  onAddStatus,
  onAddTransition,
  onSave,
  onRemoveStatus,
}: WorkflowVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("vertical")

  const centers = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    workflow.statuses.forEach((status) => {
      map.set(status.id, getStatusCenter(status, orientation))
    })
    return map
  }, [workflow.statuses, orientation])

  const handleDragEnd = (statusId: string, event: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
    const containerRect = containerRef.current?.getBoundingClientRect()
    const target = event.currentTarget as HTMLElement | null
    if (!containerRect || !target) return

    const rect = target.getBoundingClientRect()
    const centerX = rect.left - containerRect.left + rect.width / 2
    const centerY = rect.top - containerRect.top + rect.height / 2
    const displayX = Math.max(1, Math.round(centerX / GRID_WIDTH))
    const displayY = Math.max(1, Math.round(centerY / GRID_HEIGHT))
    const canonical =
      orientation === "vertical"
        ? { x: displayX, y: displayY }
        : { x: displayY, y: displayX }

    onStatusPositionChange(statusId, canonical)
  }

  return (
    <div className="relative h-full rounded-lg border border-border/60 bg-muted/20">
      <div className="absolute inset-0 flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 p-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Disposition</Label>
            <Select value={orientation} onValueChange={(value) => setOrientation(value as "horizontal" | "vertical")}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">Verticale</SelectItem>
                <SelectItem value="horizontal">Horizontale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onAddStatus} className="gap-2">
              <Plus className="h-4 w-4" /> Statut
            </Button>
            <Button size="sm" variant="outline" onClick={onAddTransition} className="gap-2">
              <Plus className="h-4 w-4" /> Transition
            </Button>
            <Button size="sm" onClick={onSave} className="gap-2">
              <Save className="h-4 w-4" /> Sauvegarder
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div
            ref={containerRef}
            className="relative min-h-[620px] min-w-[960px] p-6"
            style={{
              minWidth:
                orientation === "horizontal"
                  ? Math.max(960, workflow.statuses.length * GRID_WIDTH)
                  : undefined,
              minHeight:
                orientation === "vertical"
                  ? Math.max(620, workflow.statuses.length * GRID_HEIGHT)
                  : undefined,
            }}
          >
            <LayoutGroup>
              {workflow.statuses.map((status) => {
                const { left, top } = getStatusPosition(status, orientation)
                return (
                  <motion.div
                    key={statusId(status)}
                    layout
                    drag
                    dragMomentum={false}
                    className="absolute z-10"
                    style={{ width: NODE_WIDTH, height: NODE_HEIGHT, left, top }}
                    onDragEnd={(event, info) => handleDragEnd(status.id, event, info)}
                    onPointerDown={() => onSelectStatus(status.id)}
                  >
                    <StatusNode
                      status={status}
                      isSelected={selectedStatusId === status.id}
                      onRemove={onRemoveStatus}
                    />
                  </motion.div>
                )
              })}
            </LayoutGroup>
            <svg className="pointer-events-none absolute inset-0 z-0" width="100%" height="100%">
              {workflow.transitions.map((transition) => {
                const from = centers.get(transition.fromStatusId)
                const to = centers.get(transition.toStatusId)
                if (!from || !to) return null
                return (
                  <TransitionArrow
                    key={transition.id}
                    transition={transition}
                    fromPosition={from}
                    toPosition={to}
                    isSelected={selectedTransitionId === transition.id}
                    onSelect={(id) => {
                      onSelectTransition(id)
                      onSelectStatus(null)
                    }}
                  />
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowVisualizer
