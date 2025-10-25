
// Component imports
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Organization } from '../types'

// icon imports
import { MdArrowForwardIos } from "react-icons/md";

interface OrganizationCardProps {
  organization: Organization
  onClick?: () => void
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

export default function OrganizationCard({ organization, onClick }: OrganizationCardProps) {
    return (
        <Card className='p-4 group cursor-pointer flex flex-col gap-3 rounded-sm bg-card hover:bg-muted transition-colors h-42' onClick={onClick}>
            
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
    )
}
