import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountSettings from './account-settings'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <AccountSettings profile={profile} />
}
