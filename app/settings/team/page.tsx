import SettingsPage from "@/features/settings/SettingsRoot"
export const dynamic = "force-static"
export default function Page() { return <SettingsPage activeTab="team" embedHeader={false} /> }
