'use client'

import { createContext, useContext, useTransition } from 'react'
import OrgSidebar from '@/components/layout/OrganizationSidebar'
import LoadingAnimation from '@/components/shared/LoadingAnimation'

interface NavigationContextType {
  isPending: boolean
  startNavigation: (callback: () => void) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()

  const startNavigation = (callback: () => void) => {
    startTransition(() => {
      callback()
    })
  }

  return (
    <NavigationContext.Provider value={{ isPending, startNavigation }}>
      <div className="flex h-full">
        <OrgSidebar />
        <main className="flex-1 ml-16 relative">
          {isPending && (
            <div className="absolute inset-0 min-h-[calc(100vh-53px)] bg-background/95 backdrop-blur-sm z-30 flex items-center justify-center pointer-events-none">
              <div className="-mt-[52px]">
                <LoadingAnimation size={80} color="#3b82f6" />
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </NavigationContext.Provider>
  )
}
