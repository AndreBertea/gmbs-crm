import Link from "next/link"
import { Workflow, Settings as SettingsIcon } from "lucide-react"

import SettingsPage from "@/features/settings/SettingsRoot"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ModalDisplayPreferencesCard } from "./ModalDisplayPreferencesCard"
import { ResetViewsCard } from "./ResetViewsCard"
import { ModalDisplayProvider } from "@/contexts/ModalDisplayContext"

export const dynamic = "force-static"

export default function Page() {
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Workflow className="h-5 w-5 text-primary" />
            Workflow des interventions
          </CardTitle>
          <CardDescription>
            Configurez les statuts, transitions et règles métier qui pilotent le cycle de vie des interventions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Accédez à l'éditeur dédié pour ajuster les étapes, obligations et actions automatiques du workflow.
          </p>
          <Button asChild className="gap-2 md:w-auto">
            <Link href="/settings/interface/workflow">
              <SettingsIcon className="h-4 w-4" />
              Ouvrir l'éditeur de workflow
            </Link>
          </Button>
        </CardContent>
      </Card>

      <ModalDisplayProvider>
        <ModalDisplayPreferencesCard />
      </ModalDisplayProvider>

      <ResetViewsCard />

      <SettingsPage activeTab="interface" embedHeader={false} />
    </div>
  )
}
