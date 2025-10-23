import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function LabPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex">
        {/* Sidebar will go here */}
        <div className="flex-1 flex flex-col">
          {/* Code editor will go here */}
          <div className="flex-1 bg-background p-4">
            <h2 className="text-xl font-semibold">Code Editor</h2>
            <p className="text-sm text-muted-foreground mt-2">Welcome, {data.user.email}</p>
          </div>
          {/* Results panel will go here */}
          <div className="h-64 border-t bg-muted/40 p-4">
            <h3 className="text-sm font-semibold">Results Panel</h3>
          </div>
        </div>
      </div>
    </div>
  )
}