import { createClient } from '@/lib/supabase/server'
import { buildUserContext } from '@/lib/dal/context'
import { ProfileRepository } from '@/lib/dal/repositories/profile.repository'
import AuthButtonsClient from './AuthButtonsClient'

export default async function AuthButtons() {
  // Create the supabase client
  const supabase = await createClient()

  // Grab the user data
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch profile data using DAL + ABAC
  let profileData = null
  if (user) {
    const userContext = await buildUserContext()
    if (userContext) {
      const profileRepo = new ProfileRepository(userContext)
      const profile = await profileRepo.getProfile(user.id)

      // Extract only fields needed for avatar (serializable for client component)
      if (profile) {
        profileData = {
          avatar_url: profile.avatar_url,
          full_name: profile.full_name,
          username: profile.username,
        }
      }
    }
  }

  // Fetch GitHub stars
  let stars
  try {
    const res = await fetch('https://api.github.com/repos/algoflow-quant/algoflow', {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })
    const data = await res.json()
    stars = data.stargazers_count
  } catch (error) {
    console.error('Failed to fetch GitHub stars:', error)
  }

  return <AuthButtonsClient user={user} stars={stars} profile={profileData} />
}
