'use client'

// React imports
import React, { useState } from 'react'

// Shadcn Imports
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// Icon imports
import { Search, Plus } from 'lucide-react'

// Component imports
import OrganizationCard from './OrganizationCard'
import LoadingAnimation from '@/components/shared/LoadingAnimation'
import CreateOrganizationDialog from './CreateOrganizationDialog'

// Hook imports
import { useOrganizations } from '../queries/useOrganizations'

export default function OrganizationManager() {
    const { data: orgs, isLoading, error } = useOrganizations()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <div className='container flex flex-col mx-auto px-4 py-10 max-w-7xl'>
        <h1 className="text-2xl">
            Your Organizations
        </h1>
        <div className='flex flex-row mt-13 justify-between'>
            <Input 
            icon={<Search className="h-4 w-4" />}
            placeholder="Search for an organization"
            className="mb-6 w-70 border-muted border-2 h-8"
            />

            <Button variant='default' size='sm' className='cursor-pointer h-8' onClick={() => setIsDialogOpen(true)}>
                <Plus color='white' className='h-4 w-4'/>
                New Organization
            </Button>

        </div>

        {isLoading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingAnimation size={64} color="#3b82f6" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-destructive">
            Error loading organizations: {error.message}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && orgs?.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <p className="text-xl text-muted-foreground mb-2">No organizations yet</p>
            <p className="text-sm text-muted-foreground mb-6">
            Create your first organization to get started with AlgoFlow
            </p>
        </div>
        )}

        {/* Organizations grid */}
        {!isLoading && !error && orgs && orgs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {orgs.map(org => (
              <OrganizationCard key={org.id} organization={org} />
            ))}
          </div>
        )}

        {/* Create Organization Dialog */}
        <CreateOrganizationDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
    </div>
  )
}
