import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { teamId, userId } = body

    if (!teamId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user is team owner
    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single()

    if (!team || team.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only team owners can remove members' },
        { status: 403 }
      )
    }

    // Prevent removing the owner
    if (userId === team.owner_id) {
      return NextResponse.json(
        { error: 'Cannot remove the team owner' },
        { status: 400 }
      )
    }

    // Remove the member
    const { error: removeError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (removeError) {
      console.error('Remove member error:', removeError)
      return NextResponse.json(
        { error: removeError.message || 'Failed to remove member' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in remove member route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
