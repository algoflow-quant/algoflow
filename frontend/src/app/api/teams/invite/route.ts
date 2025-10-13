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
    const { teamId, teamName, identifier, identifierType } = body

    if (!teamId || !teamName || !identifier || !identifierType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (identifierType !== 'email' && identifierType !== 'username') {
      return NextResponse.json(
        { error: 'Invalid identifier type' },
        { status: 400 }
      )
    }

    // Use the database function with elevated permissions
    const { data: invitationId, error: inviteError } = await supabase.rpc('create_team_invitation', {
      p_team_id: teamId,
      p_team_name: teamName,
      p_identifier: identifier,
      p_identifier_type: identifierType
    })

    if (inviteError) {
      console.error('Invitation error:', inviteError)
      return NextResponse.json(
        { error: inviteError.message || 'Failed to create invitation' },
        { status: 400 }
      )
    }

    // TODO: Add email notification here when ready
    // if (process.env.SEND_EMAIL_INVITES === 'true') {
    //   await sendInviteEmail(identifier, teamName, invitationId)
    // }

    return NextResponse.json({
      success: true,
      invitationId
    })
  } catch (error) {
    console.error('Error in invite route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
