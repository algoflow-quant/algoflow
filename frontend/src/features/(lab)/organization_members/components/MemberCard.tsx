'use client'

// Component imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

// Import types
import type { OrganizationMember } from '../types'

// to be passed to the member card
interface MemberCardProps {
    member: OrganizationMember
    isOnline?: boolean
}

export default function MemberCard({ member, isOnline = false }: MemberCardProps) {

    // Get role badge styling
    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-red-500 text-primary-foreground'
            case 'moderator': return 'bg-blue-500 text-white'
            case 'member': return 'bg-muted text-muted-foreground'
            default: return 'bg-muted'
        }
    }
    return (
        <Card className="p-4 flex-row items-center gap-4 hover:bg-muted/50 transition-colors rounded-sm">
            {/* Avatar with online indicator */}
            <div className="relative">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={member.profiles.avatar_url || undefined} />
                    <AvatarFallback>
                        {member.profiles.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                {isOnline && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                )}
            </div>

            {/* Member info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">
                    {member.profiles.full_name || member.profiles.username}
                </h3>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                @{member.profiles.username}
                </p>
            </div>

            {/* Role badge */}
            <Badge className={getRoleBadgeColor(member.role)}>
                {member.role}
            </Badge>
        </Card>
    )
}