import { createClient } from '@/lib/supabase/server'
import AuthButtonsClient from './AuthButtonsClient'

export default async function AuthButtons() {
  // Create the supabase client
  const supabase = await createClient()

  // Grab the user data
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch GitHub stars
  let stars
  try {
    const res = await fetch('https://api.github.com/repos/algoflow-quant/algoflow', {
        next: { revalidate: 3600 } // Cache for 1 hour
    })
    const data = await res.json()
    stars = data.stargazers_count
  } catch (error) {
    console.error('Failed to fetch GitHub stars:', error)
  }

  return <AuthButtonsClient user={user} stars={stars} />
}
