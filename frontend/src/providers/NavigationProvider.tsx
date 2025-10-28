'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface NavigationContextType {
  isNavigating: boolean
  navigate: (path: string) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

/**
 * Global navigation provider that handles loading states for all sidebar navigation
 * Works by tracking the target path and showing loading until pathname actually changes
 */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)
  const [targetPath, setTargetPath] = useState<string | null>(null)

  // When pathname changes to our target, stop showing loading state
  useEffect(() => {
    if (pathname === targetPath) {
      setIsNavigating(false)
      setTargetPath(null)
    }
  }, [pathname, targetPath])

  const navigate = (path: string) => {
    // Don't show loading if we're already on this page
    if (path === pathname) return

    setTargetPath(path)
    setIsNavigating(true)
    router.push(path)
  }

  return (
    <NavigationContext.Provider value={{ isNavigating, navigate }}>
      {children}
    </NavigationContext.Provider>
  )
}

/**
 * Hook to access navigation state and navigate function
 * Use this in any sidebar or navigation component
 */
export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}
