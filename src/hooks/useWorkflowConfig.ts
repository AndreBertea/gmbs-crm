"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { generateId } from "@/lib/utils/generate-id"
import { loadWorkflowConfig, persistWorkflowConfig } from "@/lib/workflow-persistence"
import { DEFAULT_WORKFLOW_CONFIG } from "@/config/interventions"
import type {
  AutoAction,
  TransitionCondition,
  WorkflowConfig,
  WorkflowStatus,
  WorkflowTransition,
} from "@/types/intervention-workflow"

export type WorkflowConfigState = {
  workflow: WorkflowConfig
  selectedStatusId: string | null
  selectedTransitionId: string | null
}

const STORAGE_KEY = "crm:interventions:workflow-config"
export const WORKFLOW_EVENT_KEY = "crm:interventions:workflow-updated"

const cloneWorkflow = (workflow: WorkflowConfig): WorkflowConfig =>
  JSON.parse(JSON.stringify(workflow)) as WorkflowConfig

const notifyWorkflowUpdate = (workflow: WorkflowConfig) => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<WorkflowConfig>(WORKFLOW_EVENT_KEY, { detail: workflow }))
}

export function useWorkflowConfig() {
  const [state, setState] = useState<WorkflowConfigState>(() => {
    const persistedWorkflow = loadWorkflowConfig(STORAGE_KEY)
    const workflow = cloneWorkflow(persistedWorkflow ?? DEFAULT_WORKFLOW_CONFIG)
    const initialStatus = workflow.statuses.find((status) => status.isInitial) ?? workflow.statuses[0]
    return {
      workflow,
      selectedStatusId: initialStatus ? initialStatus.id : null,
      selectedTransitionId: null,
    }
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<WorkflowConfig>).detail
      if (!detail) return
      setState((prev) => ({ ...prev, workflow: cloneWorkflow(detail) }))
    }
    window.addEventListener(WORKFLOW_EVENT_KEY, handler as EventListener)
    return () => {
      window.removeEventListener(WORKFLOW_EVENT_KEY, handler as EventListener)
    }
  }, [])

  const selectedStatus = useMemo(
    () => state.workflow.statuses.find((status) => status.id === state.selectedStatusId) ?? null,
    [state.workflow.statuses, state.selectedStatusId],
  )

  const selectedTransition = useMemo(
    () => state.workflow.transitions.find((transition) => transition.id === state.selectedTransitionId) ?? null,
    [state.workflow.transitions, state.selectedTransitionId],
  )

  const setWorkflow = useCallback((workflow: WorkflowConfig) => {
    const cloned = cloneWorkflow(workflow)
    setState((prev) => ({ ...prev, workflow: cloned }))
    persistWorkflowConfig(STORAGE_KEY, cloned)
    notifyWorkflowUpdate(cloned)
  }, [])

  const selectStatus = useCallback((statusId: string | null) => {
    setState((prev) => ({ ...prev, selectedStatusId: statusId, selectedTransitionId: null }))
  }, [])

  const selectTransition = useCallback((transitionId: string | null) => {
    setState((prev) => ({ ...prev, selectedTransitionId: transitionId, selectedStatusId: null }))
  }, [])

  const addStatus = useCallback((payload?: Partial<WorkflowStatus>) => {
    setState((prev) => {
      const status: WorkflowStatus = {
        id: generateId("status"),
        key: payload?.key ?? "NEW_STATUS",
        label: payload?.label ?? "Nouveau statut",
        description: payload?.description,
        color: payload?.color ?? "#6366F1",
        icon: payload?.icon ?? "Square",
        isTerminal: payload?.isTerminal ?? false,
        isInitial: payload?.isInitial ?? false,
        position: payload?.position ?? { x: 1, y: prev.workflow.statuses.length + 1 },
        metadata: {
          requiresArtisan: false,
          requiresFacture: false,
          requiresProprietaire: false,
          requiresCommentaire: false,
          requiresDevisId: false,
          ...payload?.metadata,
        },
      }

      const workflow: WorkflowConfig = {
        ...prev.workflow,
        statuses: [...prev.workflow.statuses, status],
        updatedAt: new Date().toISOString(),
      }
      const cloned = cloneWorkflow(workflow)
      persistWorkflowConfig(STORAGE_KEY, cloned)
      notifyWorkflowUpdate(cloned)
      return { ...prev, workflow: cloned, selectedStatusId: status.id, selectedTransitionId: null }
    })
  }, [])

  const updateStatus = useCallback((statusId: string, patch: Partial<WorkflowStatus>) => {
    setState((prev) => {
      const workflow: WorkflowConfig = {
        ...prev.workflow,
        statuses: prev.workflow.statuses.map((status) =>
          status.id === statusId
            ? {
                ...status,
                ...patch,
                metadata: { ...status.metadata, ...patch.metadata },
              }
            : status,
        ),
        updatedAt: new Date().toISOString(),
      }
      const cloned = cloneWorkflow(workflow)
      persistWorkflowConfig(STORAGE_KEY, cloned)
      notifyWorkflowUpdate(cloned)
      return { ...prev, workflow: cloned }
    })
  }, [])

  const updateStatusPosition = useCallback((statusId: string, position: { x: number; y: number }) => {
    updateStatus(statusId, { position })
  }, [updateStatus])

  const removeStatus = useCallback((statusId: string) => {
    setState((prev) => {
      const workflow: WorkflowConfig = {
        ...prev.workflow,
        statuses: prev.workflow.statuses.filter((status) => status.id !== statusId),
        transitions: prev.workflow.transitions.filter(
          (transition) => transition.fromStatusId !== statusId && transition.toStatusId !== statusId,
        ),
        updatedAt: new Date().toISOString(),
      }
      const cloned = cloneWorkflow(workflow)
      persistWorkflowConfig(STORAGE_KEY, cloned)
      notifyWorkflowUpdate(cloned)
      return { ...prev, workflow: cloned, selectedStatusId: null, selectedTransitionId: null }
    })
  }, [])

  const addTransition = useCallback(
    (payload?: Partial<WorkflowTransition>) => {
      setState((prev) => {
        if (prev.workflow.statuses.length < 2) return prev
        const fromStatusId = payload?.fromStatusId ?? prev.workflow.statuses[0].id
        const toStatusId =
          payload?.toStatusId ?? prev.workflow.statuses.find((status) => status.id !== fromStatusId)?.id
        if (!toStatusId) return prev

        const transition: WorkflowTransition = {
          id: generateId("transition"),
          fromStatusId,
          toStatusId,
          label: payload?.label ?? "Nouvelle transition",
          description: payload?.description,
          conditions: payload?.conditions ?? [],
          autoActions: payload?.autoActions ?? [],
          isActive: payload?.isActive ?? true,
        }

        const workflow: WorkflowConfig = {
          ...prev.workflow,
          transitions: [...prev.workflow.transitions, transition],
          updatedAt: new Date().toISOString(),
        }
        const cloned = cloneWorkflow(workflow)
        persistWorkflowConfig(STORAGE_KEY, cloned)
        notifyWorkflowUpdate(cloned)
        return { ...prev, workflow: cloned, selectedTransitionId: transition.id, selectedStatusId: null }
      })
    },
    [],
  )

  const updateTransition = useCallback((transitionId: string, patch: Partial<WorkflowTransition>) => {
    setState((prev) => {
      const workflow: WorkflowConfig = {
        ...prev.workflow,
        transitions: prev.workflow.transitions.map((transition) =>
          transition.id === transitionId
            ? {
                ...transition,
                ...patch,
                conditions: patch.conditions ?? transition.conditions,
                autoActions: patch.autoActions ?? transition.autoActions,
              }
            : transition,
        ),
        updatedAt: new Date().toISOString(),
      }
      const cloned = cloneWorkflow(workflow)
      persistWorkflowConfig(STORAGE_KEY, cloned)
      notifyWorkflowUpdate(cloned)
      return { ...prev, workflow: cloned }
    })
  }, [])

  const removeTransition = useCallback((transitionId: string) => {
    setState((prev) => {
      const workflow: WorkflowConfig = {
        ...prev.workflow,
        transitions: prev.workflow.transitions.filter((transition) => transition.id !== transitionId),
        updatedAt: new Date().toISOString(),
      }
      const cloned = cloneWorkflow(workflow)
      persistWorkflowConfig(STORAGE_KEY, cloned)
      notifyWorkflowUpdate(cloned)
      return { ...prev, workflow: cloned, selectedTransitionId: null }
    })
  }, [])

  const updateStatusMetadata = useCallback(
    (statusId: string, metadataPatch: Partial<WorkflowStatus["metadata"]>) => {
      updateStatus(statusId, {
        metadata: { ...selectedStatus?.metadata, ...metadataPatch } as WorkflowStatus["metadata"],
      })
    },
    [updateStatus, selectedStatus?.metadata],
  )

  const togglePinStatus = useCallback((statusId: string) => {
    setState((prev) => {
      const statuses = prev.workflow.statuses.map((status) => {
        if (status.id !== statusId) return status
        const isPinned = !status.isPinned
        const pinnedStatuses = prev.workflow.statuses.filter((item) => item.isPinned && item.id !== status.id)
        const nextOrder = isPinned
          ? (pinnedStatuses.reduce((max, item) => Math.max(max, item.pinnedOrder ?? 0), 0) ?? 0) + 1
          : undefined
        return {
          ...status,
          isPinned,
          pinnedOrder: isPinned ? nextOrder ?? 0 : undefined,
        }
      })

      const normalized = statuses
        .map((status) => ({ ...status }))
        .sort((a, b) => (a.pinnedOrder ?? Infinity) - (b.pinnedOrder ?? Infinity))
        .map((status, index) =>
          status.isPinned ? { ...status, pinnedOrder: index } : status,
        )

      const workflow: WorkflowConfig = {
        ...prev.workflow,
        statuses: normalized,
        updatedAt: new Date().toISOString(),
      }
      const cloned = cloneWorkflow(workflow)
      persistWorkflowConfig(STORAGE_KEY, cloned)
      notifyWorkflowUpdate(cloned)
      return { ...prev, workflow: cloned }
    })
  }, [])

  const updateTransitionConditions = useCallback((transitionId: string, conditions: TransitionCondition[]) => {
    updateTransition(transitionId, { conditions })
  }, [updateTransition])

  const updateTransitionAutoActions = useCallback((transitionId: string, autoActions: AutoAction[]) => {
    updateTransition(transitionId, { autoActions })
  }, [updateTransition])

  const saveWorkflow = useCallback(() => {
    setState((prev) => {
      const workflow: WorkflowConfig = {
        ...prev.workflow,
        updatedAt: new Date().toISOString(),
      }
      const cloned = cloneWorkflow(workflow)
      persistWorkflowConfig(STORAGE_KEY, cloned)
      notifyWorkflowUpdate(cloned)
      return { ...prev, workflow: cloned }
    })
  }, [])

  return {
    workflow: state.workflow,
    selectedStatus,
    selectedTransition,
    selectedStatusId: state.selectedStatusId,
    selectedTransitionId: state.selectedTransitionId,
    selectStatus,
    selectTransition,
    addStatus,
    updateStatus,
    updateStatusMetadata,
    togglePinStatus,
    updateStatusPosition,
    removeStatus,
    addTransition,
    updateTransition,
    updateTransitionConditions,
    updateTransitionAutoActions,
    removeTransition,
    setWorkflow,
    saveWorkflow,
  }
}
