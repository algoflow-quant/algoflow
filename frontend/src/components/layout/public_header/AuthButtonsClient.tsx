'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShineBorder } from '@/components/ui/shine-border'
import AvatarDropdown from '@/components/shared/AvatarDropdown'
import { FaGithub } from 'react-icons/fa'
import { cn } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

// Simplified profile type (only avatar-related fields)
type ProfileData = {
  avatar_url: string | null
  full_name: string | null
  username: string
} | null

interface AuthButtonsClientProps {
  user: User | null
  stars: number | undefined
  profile: ProfileData
}

export default function AuthButtonsClient({ user, stars, profile }: AuthButtonsClientProps) {
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (user) {
    // Logged in conditional: shows avatar + strategy lab button
    return (
      <div className="flex items-center gap-2 ml-auto">
        <Link
          href="https://github.com/cadenlund/algoflow"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="ghost"
            className={cn(
              'h-[28px] text-xs tracking-wide flex items-center gap-2 text-muted-foreground transition-opacity duration-300',
              isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
          >
            <FaGithub className="w-4 h-4" />
            {stars}
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="default" className="h-[28px] text-xs tracking-wide">
            Strategy Lab
          </Button>
        </Link>
        {/* @ts-expect-error - VS Code type cache issue */}
        <AvatarDropdown user={user} profile={profile} />
      </div>
    )
  }

  // Logged out: Show Login + Build Your First Strategy buttons
  return (
    <div className="flex items-center gap-2 ml-auto">
      <Link href="https://github.com/cadenlund/algoflow" target="_blank" rel="noopener noreferrer">
        <Button
          variant="ghost"
          className={cn(
            'h-[28px] text-xs tracking-wide flex items-center gap-2 text-muted-foreground transition-opacity duration-300',
            isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          <FaGithub className="w-4 h-4" />
          {stars}
        </Button>
      </Link>
      <Link href="/login">
        <Button variant="ghost" className="h-[28px] text-xs tracking-wide bg-muted/30">
          Login
        </Button>
      </Link>
      <div className={cn('relative rounded-md', isScrolled && 'hidden')}>
        <ShineBorder shineColor="#3b82f6" className="rounded-md" />
        <Link href="/signup">
          <Button variant="outline" className="h-[28px] relative z-10 text-xs tracking-wide">
            <span>Build Your First Strategy</span>
          </Button>
        </Link>
      </div>
      <div className={cn('relative rounded-md', isScrolled ? 'inline-flex' : 'hidden')}>
        <ShineBorder shineColor="#3b82f6" className="rounded-md" />
        <Button asChild variant="outline" className="h-[28px] relative z-10 text-xs tracking-wide">
          <Link href="/signup">
            <span>Get Started</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
