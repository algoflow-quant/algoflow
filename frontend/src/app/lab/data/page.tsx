import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DataStorePage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold">Data Store</h1>
      <p className="text-muted-foreground mt-2">Coming soon...</p>
    </div>
  )
}
