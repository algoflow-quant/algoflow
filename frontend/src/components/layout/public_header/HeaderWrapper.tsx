'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export default function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full">
      <div className={cn('mx-auto transition-all duration-300 pt-4', isScrolled ? 'max-w-5xl' : 'max-w-7xl')}>
        <nav className={cn('transition-all duration-300 px-6 border rounded-md', isScrolled ? 'bg-background/75 border-border backdrop-blur-lg shadow-lg' : 'bg-transparent border-transparent')}>
          <div className="flex items-center relative w-full h-14">
            {children}
          </div>
        </nav>
      </div>
    </header>
  )
}
