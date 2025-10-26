'use client'

// React import
import { useState } from 'react'

// Component imports
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import MemberCard from './MemberCard'

// Icon imports
import { Search, UserPlus } from 'lucide-react'

// Hook imports
import { useMembers } from '../queries/useMembers'
import { isUserOnline } from '../queries/useGlobalPresence'

interface MembersManagerProps {
  organizationId: string
}

export default function MembersManager({ organizationId }: MembersManagerProps) {
    const { data: members, isLoading, error } = useMembers(organizationId)
    const [searchQuery, setSearchQuery] = useState('')

    // Filter members by search query
    const filteredMembers = members?.filter(member =>
      member.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.profiles.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <div className='container flex flex-col mx-auto px-4 py-10 max-w-7xl'>
        <h1 className="text-2xl">
            Members
        </h1>
        <div className='flex flex-row mt-13 justify-between'>
            <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-6 w-70 border-muted border-2 h-8"
            />

            <Button variant='default' size='sm' className='cursor-pointer h-8'>
            <UserPlus color='white' className='h-4 w-4'/>
            Invite Member
            </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col gap-4 mt-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 flex-row items-center gap-4 rounded-sm">
                {/* Avatar skeleton */}
                <div className="h-12 w-12 bg-muted rounded-full relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>

                {/* Member info skeleton */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="h-4 bg-muted rounded w-1/3 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </div>
                  <div className="h-3 bg-muted rounded w-1/4 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </div>
                </div>

                {/* Badge skeleton */}
                <div className="h-5 w-20 bg-muted rounded relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-destructive">
            Error loading members: {error.message}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredMembers?.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <p className="text-xl text-muted-foreground mb-2">No members found</p>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery ? 'Try a different search term' : 'Invite members to get started'}
            </p>
          </div>
        )}

        {/* Members list */}
        {!isLoading && !error && filteredMembers && filteredMembers.length > 0 && (
          <div className="flex flex-col gap-4 mt-3">
            {filteredMembers.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                isOnline={isUserOnline(member.profiles.last_seen_at)}
              />
            ))}
          </div>
        )}
    </div>
  )
}
