'use client'

// React imports
import { useTransition } from 'react'

// Component imports
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import LoadingAnimation from '@/components/shared/LoadingAnimation'

// Next imports
import { useRouter } from 'next/navigation'

// icon imports
import { MdArrowForwardIos } from "react-icons/md"

// Type: Organization with all fields from single table
interface OrganizationCardProps {
  organization: {
    id: string
    name: string
    type: string
    plan: string
    credits_balance: number
    credits_limit: number
  }
}

// Helper function to get badge variant based on plan
const getPlanVariant = (plan: string): "default" | "secondary" | "destructive" | "outline" | "purple" | "green" | "gold" => {
  switch(plan) {
    case 'free': return 'secondary' // gray
    case 'standard': return 'default' // blue
    case 'pro': return 'purple' // purple
    case 'team': return 'green' // green
    case 'enterprise': return 'gold' // gold
    case 'admin': return 'destructive' // red
    default: return 'secondary'
  }
}

export default function OrganizationCard({ organization }: OrganizationCardProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleClick = () => {
        startTransition(() => {
            router.push(`/dashboard/${organization.id}`)
        })
    }

    return (
        <>
            {/* Full-page loading overlay */}
            {isPending && (
                <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
                    <LoadingAnimation size={64} color="#3b82f6" />
                </div>
            )}

            <Card className='p-4 group cursor-pointer flex flex-col gap-3 rounded-sm bg-card hover:bg-muted transition-colors h-42' onClick={handleClick}>
                <div className='flex flex-row justify-between'>
                    {/* Organization name */}
                    <h3 className="text-sm font-semibold">{organization.name}</h3>
                    <MdArrowForwardIos className="h-4 w-4 fill-muted-foreground stroke-muted-foreground group-hover:fill-white group-hover:stroke-white group-hover:translate-x-1 transition-all duration-200" style={{ color: 'var(--muted-foreground)' }} />
                </div>

                {/* Badges */}
                <div className="flex gap-2">
                    <Badge className='rounded-sm' variant={getPlanVariant(organization.plan)}>{organization.plan}</Badge>
                    <Badge className='rounded-sm' variant="outline">{organization.type}</Badge>
                </div>

                {/* Credits */}
                <div className="text-xs mt-auto ml-auto text-muted-foreground">
                    {organization.credits_balance.toLocaleString()} / {organization.credits_limit.toLocaleString()} credits
                </div>
            </Card>
        </>
    )
}
