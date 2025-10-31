'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface DataFeedData {
  name: string
  description: string
  status: 'online' | 'offline' | 'syncing'
  latency?: string
  uptime?: string
  icon?: React.ReactNode
}

interface DataCardProps {
  feed: DataFeedData
  className?: string
  animated?: boolean
  delay?: number
}

export function DataCard({ feed, className, animated = false, delay = 0 }: DataCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'offline':
        return 'bg-red-500'
      case 'syncing':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'offline':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'syncing':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default:
        return 'bg-muted'
    }
  }

  return (
    <Card
      className={cn(
        'p-4 flex-row items-center gap-4 transition-all duration-300 rounded-sm relative overflow-hidden border-2',
        animated && 'opacity-0 animate-fade-in',
        className
      )}
      style={{
        animationDelay: animated ? `${delay}ms` : undefined,
      }}
    >
      {/* Icon/Status Indicator */}
      <div className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
        {feed.icon || (
          <div className={cn('w-3 h-3 rounded-full', getStatusColor(feed.status), feed.status === 'online' && 'animate-pulse')} />
        )}
      </div>

      {/* Feed info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{feed.name}</h3>
        </div>
        <p className="text-sm text-muted-foreground truncate">{feed.description}</p>
        {(feed.latency || feed.uptime) && (
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {feed.latency && <span>Latency: {feed.latency}</span>}
            {feed.uptime && <span>Uptime: {feed.uptime}</span>}
          </div>
        )}
      </div>

      {/* Status badge */}
      <Badge className={cn('border', getStatusBadge(feed.status))}>
        {feed.status}
      </Badge>
    </Card>
  )
}
