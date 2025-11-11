"use client"

import WorkflowAdminModal, { WorkflowEditor } from "@/components/interventions/WorkflowAdminModal"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default function WorkflowSettingsPage() {
  const [isModalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Configuration du workflow</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les statuts, transitions et règles métier du cycle de vie des interventions.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Settings className="h-4 w-4" /> Ouvrir l&apos;éditeur plein écran
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow des interventions</CardTitle>
          <CardDescription>Visualisez et ajustez la cartographie des statuts.</CardDescription>
        </CardHeader>
        <CardContent className="h-[560px]">
          <WorkflowEditor />
        </CardContent>
      </Card>

      <WorkflowAdminModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
