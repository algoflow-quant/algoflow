import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DataSourcePage({ params }: { params: { dataSource: string } }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  const { dataSource } = params

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold capitalize">{dataSource.replace('-', ' ')}</h1>
      <p className="text-muted-foreground mt-2">Coming soon...</p>
    </div>
  )
}
