"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserTeams, createTeam, type Team } from "@/lib/api/teams"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { BorderBeam } from "@/components/ui/border-beam"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { Textarea } from "@/components/ui/textarea"

export function TeamSelectionContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  // Form state
  const [teamName, setTeamName] = useState("")
  const [teamDescription, setTeamDescription] = useState("")

  useEffect(() => {
    loadTeams()
  }, [])

  // Real-time subscriptions for teams
  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    // Subscribe to team_members to detect when user joins or gets kicked
    const teamMembersChannel = supabase
      .channel(`team-selection-members-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        async (payload) => {
          console.log('[TeamSelection] team_members event:', payload.eventType)

          if (payload.eventType === 'INSERT') {
            const newMember = payload.new as { user_id: string }
            if (newMember.user_id === user.id) {
              console.log('[TeamSelection] User joined new team, reloading')
              await loadTeams()
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedMember = payload.old as { user_id: string, team_id: string }
            if (deletedMember.user_id === user.id) {
              console.log('[TeamSelection] User kicked from team, removing from list')
              setTeams(prev => prev.filter(t => t.id !== deletedMember.team_id))
            }
          }
        }
      )
      .subscribe()

    // Subscribe to teams table for name/description updates
    const teamsChannel = supabase
      .channel(`team-selection-teams-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
        },
        async (payload) => {
          const updatedTeam = payload.new as Team
          console.log('[TeamSelection] Team updated:', updatedTeam.name)
          setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(teamMembersChannel)
      supabase.removeChannel(teamsChannel)
    }
  }, [user?.id])

  const loadTeams = async () => {
    try {
      setLoading(true)
      const userTeams = await getUserTeams()
      setTeams(userTeams)
    } catch (err) {
      console.error("Error loading teams:", err)
      setError("Failed to load teams")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setCreating(true)

    try {
      const newTeam = await createTeam(teamName, teamDescription)
      setTeams([...teams, newTeam])
      setShowCreateForm(false)
      setTeamName("")
      setTeamDescription("")
      // Dispatch event to update sidebar
      window.dispatchEvent(new Event('teamCreated'))
      router.push(`/lab/${newTeam.id}`)
    } catch (err) {
      console.error("Error creating team:", err)
      setError(err instanceof Error ? err.message : String(err) || "Failed to create team")
    } finally {
      setCreating(false)
    }
  }

  // Check if user is authenticated
  if (!user && !loading) {
    return (
      <div className="relative flex items-center justify-center flex-1 overflow-hidden bg-gradient-to-br from-background via-brand-blue/20 to-background">
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          color="rgb(60, 160, 255)"
          maxOpacity={0.8}
          flickerChance={0.3}
          className="absolute inset-0 w-full h-full [mask-image:radial-gradient(1000px_circle_at_center,white,transparent)]"
        />
        <Card className="relative w-full max-w-md z-10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Not Authenticated</CardTitle>
            <CardDescription>Please log in to continue</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center space-y-4">
            <Button
              onClick={() => router.push('/login')}
              className="w-full bg-brand-blue hover:bg-brand-blue-dark"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="relative flex items-center justify-center flex-1 overflow-hidden bg-gradient-to-br from-background via-brand-blue/20 to-background">
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          color="rgb(60, 160, 255)"
          maxOpacity={0.8}
          flickerChance={0.3}
          className="absolute inset-0 w-full h-full [mask-image:radial-gradient(1000px_circle_at_center,white,transparent)]"
        />
        <Card className="relative w-full max-w-md z-10">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading teams...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center flex-1 overflow-hidden bg-gradient-to-br from-background via-brand-blue/20 to-background">
      <FlickeringGrid
        squareSize={4}
        gridGap={6}
        color="rgb(60, 160, 255)"
        maxOpacity={0.8}
        flickerChance={0.3}
        className="absolute -inset-px w-[calc(100%+2px)] h-[calc(100%+2px)] [mask-image:radial-gradient(1000px_circle_at_center,white,transparent)]"
      />

      <div className="relative w-full max-w-lg z-10">
        {!showCreateForm ? (
          <Card className="relative overflow-hidden">
            <BorderBeam
              size={250}
              duration={12}
              colorFrom="var(--brand-blue)"
              colorTo="var(--brand-blue-light)"
            />
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Select a Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {teams.length > 0 ? (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => router.push(`/lab/${team.id}`)}
                      className="w-full text-left p-4 rounded-lg border border-border hover:border-brand-blue hover:bg-brand-blue/5 transition-colors"
                    >
                      <div className="font-semibold">{team.name}</div>
                      {team.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {team.description}
                        </div>
                      )}
                    </button>
                  ))}

                  <div className="text-center text-sm text-muted-foreground pt-2">
                    — or create one —
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>You don&apos;t have any teams yet.</p>
                  <p className="text-sm mt-1">Create your first team to get started.</p>
                </div>
              )}

              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-brand-blue hover:bg-brand-blue-dark"
                disabled={teams.length >= 5}
              >
                {teams.length >= 5 ? "Maximum teams reached (5)" : "Create New Team"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="relative overflow-hidden">
            <BorderBeam
              size={250}
              duration={12}
              colorFrom="var(--brand-blue)"
              colorTo="var(--brand-blue-light)"
            />
            <CardHeader>
              <CardTitle>Create New Team</CardTitle>
              <CardDescription>
                Create a team to organize your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTeam}>
                <FieldGroup>
                  {error && (
                    <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <Field>
                    <FieldLabel htmlFor="team-name">Team Name</FieldLabel>
                    <Input
                      id="team-name"
                      type="text"
                      placeholder="My Awesome Team"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                      disabled={creating}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="team-description">
                      Description (optional)
                    </FieldLabel>
                    <Textarea
                      id="team-description"
                      placeholder="What does your team work on?"
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      disabled={creating}
                      rows={3}
                    />
                  </Field>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        setTeamName("")
                        setTeamDescription("")
                        setError("")
                      }}
                      disabled={creating}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-brand-blue hover:bg-brand-blue-dark"
                      disabled={creating}
                    >
                      {creating ? "Creating..." : "Create Team"}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
