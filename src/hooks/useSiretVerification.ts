"use client"

import { useState, useCallback } from "react"
import { validateSiret } from "@/lib/siret-validation"
import { useToast } from "@/hooks/use-toast"

type SiretVerificationResult = {
  exists: boolean
  siret: string
  raison_sociale?: string
  nom?: string
  prenom?: string
  statut_juridique?: string
  adresse?: {
    numero: string
    voie: string
    type_voie: string
    code_postal: string
    ville: string
  } | null
}

type UseSiretVerificationReturn = {
  verifySiret: (siret: string) => Promise<SiretVerificationResult | null>
  isLoading: boolean
  error: string | null
  isUnavailable: boolean
}

export function useSiretVerification(): UseSiretVerificationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const { toast } = useToast()

  const verifySiret = useCallback(
    async (siret: string): Promise<SiretVerificationResult | null> => {
      // Nettoyer le SIRET (supprimer espaces)
      const cleanSiret = siret.replace(/\s/g, "")

      // Si vide → retourner null sans requête
      if (cleanSiret.length === 0) {
        return null
      }

      // Validation Luhn côté client avant requête (éviter requêtes inutiles)
      const validation = validateSiret(cleanSiret)
      if (!validation.isValid) {
        setError(validation.errorMessage || "SIRET invalide")
        toast({
          title: "SIRET invalide",
          description: validation.errorMessage || "Le SIRET n'est pas valide",
          variant: "destructive",
        })
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/siret/verify?siret=${encodeURIComponent(cleanSiret)}`)

        // Vérifier si la réponse est OK avant de parser le JSON
        if (!response.ok && response.status !== 404) {
          setIsLoading(false)
          const errorText = await response.text().catch(() => "Erreur inconnue")
          let errorMessage = "Erreur lors de la vérification"
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorMessage
          } catch {
            errorMessage = `Erreur ${response.status}: ${errorText}`
          }
          toast({
            title: "Erreur de vérification",
            description: errorMessage,
            variant: "destructive",
          })
          return null
        }

        const data = (await response.json()) as SiretVerificationResult & {
          error?: string
          unavailable?: boolean
        }

        if (response.status === 404) {
          setIsLoading(false)
          toast({
            title: "SIRET introuvable",
            description: data.error || "Ce SIRET n'existe pas dans la base de données INSEE",
            variant: "destructive",
          })
          return null
        }

        if (data.unavailable === true) {
          setIsUnavailable(true)
          setIsLoading(false)
          const errorMessage = data.error || "La vérification automatique est temporairement indisponible"
          toast({
            title: "Service indisponible",
            description: errorMessage,
            variant: "destructive",
          })
          return null
        }

        if (data.error) {
          setIsLoading(false)
          toast({
            title: "Erreur de vérification",
            description: data.error,
            variant: "destructive",
          })
          return null
        }

        if (data.exists === true) {
          setIsLoading(false)
          toast({
            title: "SIRET vérifié",
            description: "Les informations de l'entreprise ont été récupérées",
          })
          return data
        }

        setIsLoading(false)
        return null
      } catch (error) {
        setIsUnavailable(true)
        setIsLoading(false)
        const errorMessage =
          error instanceof Error ? error.message : "Erreur réseau lors de la vérification"
        setError(errorMessage)
        toast({
          title: "Erreur de vérification",
          description: "Impossible de vérifier le SIRET. Veuillez réessayer plus tard.",
          variant: "destructive",
        })
        return null
      }
    },
    [toast]
  )

  return {
    verifySiret,
    isLoading,
    error,
    isUnavailable,
  }
}

