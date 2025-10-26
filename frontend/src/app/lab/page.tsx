// Next js imports
import { redirect } from 'next/navigation'

// Supabase imports
import { createClient } from '@/server/supabase/server'

// Component imports
import OrganizationManager from '@/features/(lab)/organizations_manager/components/OrganizationManager'


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