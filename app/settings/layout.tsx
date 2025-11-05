import type { ReactNode } from "react"
import SettingsNav from "@/features/settings/SettingsNav"
import PrefetchSettingsTabs from "@/features/settings/PrefetchSettingsTabs"

export const dynamic = "force-dynamic"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
      <SettingsNav />
      <PrefetchSettingsTabs />
      <div className="mt-6">{children}</div>
    </section>
  )
}
