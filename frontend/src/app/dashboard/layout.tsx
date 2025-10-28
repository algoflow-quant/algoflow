import SpaHeader from '@/components/layout/DashboardHeader'
import { PresenceProvider } from '@/providers/PresenceProvider'
import { NavigationProvider } from '@/providers/NavigationProvider'

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <div className="min-h-screen flex flex-col">
        <PresenceProvider />
        <SpaHeader />
        <main className="flex-1">{children}</main>
      </div>
    </NavigationProvider>
  )
}
