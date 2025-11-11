"use client"

import { useState } from "react"
import { RotateCcw, AlertTriangle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useInterventionViews } from "@/hooks/useInterventionViews"
import { useToast } from "@/hooks/use-toast"

export function ResetViewsCard() {
  const [showDialog, setShowDialog] = useState(false)
  const { resetAllViews } = useInterventionViews()
  const { toast } = useToast()

  const handleReset = () => {
    resetAllViews()
    setShowDialog(false)
    
    toast({
      title: "Vues réinitialisées",
      description: "Toutes les vues ont été restaurées aux paramètres par défaut.",
      variant: "default",
    })

    // Recharger la page pour s'assurer que toutes les vues sont mises à jour
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="h-5 w-5 text-primary" />
            Réinitialiser les vues des interventions
          </CardTitle>
          <CardDescription>
            Restaurer toutes les vues du tableau d&apos;interventions aux paramètres par défaut de l&apos;application.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Action irréversible
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Cette action supprimera toutes vos personnalisations de vues (colonnes visibles, largeurs, filtres, tris, etc.) 
                et les remplacera par les paramètres par défaut de l&apos;application. Les vues personnalisées que vous avez créées seront également supprimées.
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Utilisez cette option si vos vues affichent d&apos;anciennes configurations ou si vous souhaitez repartir de zéro.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDialog(true)}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser toutes les vues
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va supprimer toutes vos personnalisations de vues et restaurer les paramètres par défaut de l&apos;application.
              <br />
              <br />
              Cette opération ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Oui, réinitialiser toutes les vues
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}






