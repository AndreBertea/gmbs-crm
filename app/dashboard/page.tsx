import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Overview } from "@/components/layout/overview"
import { RecentSales } from "@/components/layout/recent-sales"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { t } from "@/config/domain"

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 space-y-6 relative">
        {/* Filigrane DEMO PAGE en mosaïque */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Grille de filigranes répétés */}
          <div className="grid grid-cols-2 gap-8 absolute inset-0">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="transform -rotate-45 text-6xl font-bold text-gray-400/60 select-none whitespace-nowrap flex items-center justify-center">
                DEMO PAGE
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
            <p className="text-muted-foreground">Vue d’ensemble de l’activité</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/interventions">Aller aux {t("deals")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/artisans">Voir les {t("contacts")}</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[
            { title: "Interventions actives", value: "32" },
            { title: "Artisans", value: "616" },
            { title: "Tâches ouvertes", value: "18" },
            { title: "CA (30 jours)", value: "€12,430" },
          ].map((m) => (
            <Card key={m.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{m.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{m.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
          <Card className="col-span-1 lg:col-span-4">
            <CardHeader>
              <CardTitle>Revenus</CardTitle>
            </CardHeader>
            <CardContent className="pl-2 pr-2">
              <Overview />
            </CardContent>
          </Card>
          <Card className="col-span-1 lg:col-span-3">
            <CardHeader>
              <CardTitle>Dernières opérations</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentSales />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
