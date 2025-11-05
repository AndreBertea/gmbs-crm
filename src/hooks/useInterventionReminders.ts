"use client"

import { useReminders } from "@/contexts/RemindersContext"

/**
 * Hook pour gérer les reminders d'interventions
 * Wrapper autour du contexte RemindersContext pour la rétrocompatibilité
 */
export function useInterventionReminders() {
  return useReminders()
}

