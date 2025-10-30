'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TerminalProps {
  children: React.ReactNode
  className?: string
}

export function Terminal({ children, className }: TerminalProps) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border bg-background p-6 font-mono text-sm shadow-2xl',
        className
      )}
    >
      {/* Terminal Content */}
      <div className="space-y-2 text-white">{children}</div>
    </div>
  )
}

interface TypingAnimationProps {
  children: string
  className?: string
  delay?: number
  speed?: number
}

export function TypingAnimation({
  children,
  className,
  delay = 0,
  speed = 50,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0
      const interval = setInterval(() => {
        if (index < children.length) {
          setDisplayedText(children.slice(0, index + 1))
          index++
        } else {
          clearInterval(interval)
          setIsComplete(true)
        }
      }, speed)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(timeout)
  }, [children, delay, speed])

  return (
    <div className={cn('font-mono', className)}>
      {displayedText}
      {!isComplete && <span className="animate-pulse">▊</span>}
    </div>
  )
}

interface AnimatedSpanProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function AnimatedSpan({
  children,
  className,
  delay = 0,
}: AnimatedSpanProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timeout)
  }, [delay])

  return (
    <div
      className={cn(
        'font-mono transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  )
}
