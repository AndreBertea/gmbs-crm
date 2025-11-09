import type { ReactNode } from "react"
import SettingsNav from "@/features/settings/SettingsNav"
import PrefetchSettingsTabs from "@/features/settings/PrefetchSettingsTabs"

export const dynamic = "force-dynamic"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-64px)]">
      {/* Titre et description retirés - déjà présents dans la topbar */}
      <SettingsNav />
      <PrefetchSettingsTabs />
      <div className="flex-1 overflow-auto min-h-0" data-settings-scroll-container>
        <div className="px-4">
          <section className="mx-auto max-w-5xl py-6">
            {children}
          </section>
        </div>
      </div>
    </div>
  )
}
