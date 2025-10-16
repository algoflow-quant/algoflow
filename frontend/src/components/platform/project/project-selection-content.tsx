"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getTeamProjects, createProject, type Project, type Team } from "@/lib/api/teams"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BorderBeam } from "@/components/ui/border-beam"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { IconFolderOpen, IconPlus } from "@tabler/icons-react"
import { CreateProjectDialog } from "@/components/platform/project/create-project-dialog"

interface ProjectSelectionContentProps {
  team: Team
}

export function ProjectSelectionContent({ team }: ProjectSelectionContentProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showOpenModal, setShowOpenModal] = useState(false)

  useEffect(() => {
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id])

  // Real-time subscriptions for projects
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to projects for this team
    const projectsChannel = supabase
      .channel(`project-selection-${team.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `team_id=eq.${team.id}`,
        },
        async (payload) => {
          console.log('[ProjectSelection] projects event:', payload.eventType)

          if (payload.eventType === 'INSERT') {
            const newProject = payload.new as Project
            console.log('[ProjectSelection] New project added:', newProject.name)
            setProjects(prev => {
              if (prev.some(p => p.id === newProject.id)) return prev
              return [...prev, newProject]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedProject = payload.new as Project
            console.log('[ProjectSelection] Project updated:', updatedProject.name)
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))
          } else if (payload.eventType === 'DELETE') {
            const deletedProject = payload.old as Project
            console.log('[ProjectSelection] Project deleted:', deletedProject.id)
            setProjects(prev => prev.filter(p => p.id !== deletedProject.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(projectsChannel)
    }
  }, [team.id])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const teamProjects = await getTeamProjects(team.id)
      setProjects(teamProjects)
    } catch (err) {
      console.error("Error loading projects:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (name: string, type: string, description?: string) => {
    try {
      const newProject = await createProject(team.id, {
        name,
        description,
        type: type as 'strategy' | 'backtest' | 'research' | 'data_analysis',
      })
      setProjects([...projects, newProject])
      // Dispatch event to update sidebar
      window.dispatchEvent(new Event('projectCreated'))
      router.push(`/lab/${team.id}/${newProject.id}`)
    } catch (err) {
      console.error("Error creating project:", err)
      alert(err instanceof Error ? err.message : String(err) || "Failed to create project")
      throw err
    }
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
          className="absolute -inset-px w-[calc(100%+2px)] h-[calc(100%+2px)] [mask-image:radial-gradient(1000px_circle_at_center,white,transparent)]"
        />
        <Card className="relative w-full max-w-md z-10">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading projects...</p>
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
        <Card className="relative overflow-hidden">
          <BorderBeam
            size={250}
            duration={12}
            colorFrom="var(--brand-blue)"
            colorTo="var(--brand-blue-light)"
          />
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{team.name}</CardTitle>
            <CardDescription>Select a Project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Open Existing Button */}
            <Button
              onClick={() => setShowOpenModal(true)}
              variant="outline"
              className="w-full h-16 flex items-center justify-start gap-3 hover:border-brand-blue hover:bg-brand-blue/5 transition-colors"
              disabled={projects.length === 0}
            >
              <IconFolderOpen className="h-6 w-6 text-brand-blue flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold">Open Existing</div>
                <div className="text-xs text-muted-foreground">
                  {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                </div>
              </div>
            </Button>

            {/* Create New Button */}
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full h-16 flex items-center justify-start gap-3 bg-brand-blue hover:bg-brand-blue-dark"
            >
              <IconPlus className="h-6 w-6 flex-shrink-0" />
              <div className="text-left">
                <div className="font-semibold">Create New</div>
                <div className="text-xs opacity-90">Start a new project</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Open Existing Projects Modal */}
        <Dialog open={showOpenModal} onOpenChange={setShowOpenModal}>
          <DialogContent className="max-w-2xl max-h-[600px] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{team.name} - Projects</DialogTitle>
              <DialogDescription>Select a project to open</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 overflow-auto pr-2 flex-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setShowOpenModal(false)
                    router.push(`/lab/${team.id}/${project.id}`)
                  }}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-brand-blue hover:bg-brand-blue/5 transition-colors"
                >
                  <div className="font-semibold">{project.name}</div>
                  {project.description && (
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {project.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue">
                      {project.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {project.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Project Modal */}
        <CreateProjectDialog
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreateProject={handleCreateProject}
        />
      </div>
    </div>
  )
}
