"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProjectSelectionContent } from "@/components/platform/project/project-selection-content"
import { getUserTeams, type Team } from "@/lib/api/teams"

export default function TeamPage({ params }: { params: Promise<{ team: string }> }) {
  const router = useRouter()
  const { team: teamId } = use(params)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTeam() {
      try {
        const teams = await getUserTeams()
        const foundTeam = teams.find((t) => t.id === teamId)

        if (!foundTeam) {
          router.push("/lab")
          return
        }

        setTeam(foundTeam)
      } catch (error) {
        console.error("Error loading team:", error)
        router.push("/lab")
      } finally {
        setLoading(false)
      }
    }

    loadTeam()
  }, [teamId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!team) {
    return null
  }

  return <ProjectSelectionContent team={team} />
}
