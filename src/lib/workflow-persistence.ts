import type { WorkflowConfig } from "@/types/intervention-workflow"

export function loadWorkflowConfig(storageKey: string): WorkflowConfig | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    return JSON.parse(raw) as WorkflowConfig
  } catch (error) {
    console.warn("workflow-persistence: unable to load config", error)
    return null
  }
}

export function persistWorkflowConfig(storageKey: string, workflow: WorkflowConfig) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(workflow))
  } catch (error) {
    console.warn("workflow-persistence: unable to persist config", error)
  }
}
