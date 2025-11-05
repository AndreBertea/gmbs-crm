export interface WorkflowStatus {
  id: string
  key: string
  label: string
  description?: string
  color: string
  icon: string
  isTerminal: boolean
  isInitial: boolean
  isPinned?: boolean
  pinnedOrder?: number
  position: { x: number; y: number }
  metadata: {
    requiresArtisan?: boolean
    requiresFacture?: boolean
    requiresProprietaire?: boolean
    requiresCommentaire?: boolean
    requiresDevisId?: boolean
    autoActions?: AutoAction[]
  }
}

export interface WorkflowTransition {
  id: string
  fromStatusId: string
  toStatusId: string
  label: string
  description?: string
  conditions: TransitionCondition[]
  autoActions?: AutoAction[]
  isActive: boolean
}

export interface TransitionCondition {
  type: "field_required" | "field_equals" | "custom_validation"
  field?: string
  value?: unknown
  message: string
}

export interface AutoAction {
  type: "send_email" | "generate_invoice" | "create_task" | "webhook"
  config: Record<string, unknown>
}

export interface WorkflowConfig {
  id: string
  name: string
  description?: string
  version: string
  isActive: boolean
  statuses: WorkflowStatus[]
  transitions: WorkflowTransition[]
  createdAt: string
  updatedAt: string
}

export interface WorkflowValidationResult {
  canTransition: boolean
  missingRequirements: string[]
  failedConditions: string[]
}

export type WorkflowEntityContext = {
  id?: string
  artisanId?: string | null
  factureId?: string | null
  proprietaireId?: string | null
  commentaire?: string | null
  devisId?: string | null
  idIntervention?: string | null
  [key: string]: unknown
}
