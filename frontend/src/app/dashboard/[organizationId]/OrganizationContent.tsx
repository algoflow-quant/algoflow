'use client'

import { useNavigation } from '@/providers/NavigationProvider'
import OrgSidebar from '@/components/layout/OrganizationSidebar'
import LoadingOverlay from '@/components/shared/LoadingOverlay'

/**
 * Client component that renders the organization layout with sidebar and loading overlay
 * Needs to be client component to access navigation state
 */
export default function OrganizationContent({ children }: { children: React.ReactNode }) {
  const { isNavigating } = useNavigation()

  return (
    <div className="flex h-full">
      <OrgSidebar />
      <main className="flex-1 ml-16 relative">
        <LoadingOverlay isLoading={isNavigating} />
        {children}
      </main>
    </div>
  )
}
