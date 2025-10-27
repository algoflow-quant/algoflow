// Next js imports
import { redirect } from 'next/navigation'

// Supabase imports
import { createClient } from '@/lib/supabase/server'

// Component imports
import OrganizationManager from '@/features/organizations/manager/components/OrganizationManager'


export default async function LabPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  return (
    <OrganizationManager/>
  )
}