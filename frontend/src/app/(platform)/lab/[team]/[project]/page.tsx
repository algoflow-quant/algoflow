"use client"

import { use, useEffect, useState } from "react"
import { WorkspaceLayout } from "@/components/platform/editor/workspace-layout"
import { usePathname } from "next/navigation"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function ProjectPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const resolvedParams = use(params)
  const pathname = usePathname()
  const [mountedProjectId, setMountedProjectId] = useState<string | null>(resolvedParams.project)

  console.log(`[ProjectPage] Rendering for project: ${resolvedParams.project}, mountedProjectId: ${mountedProjectId}`)

  // Force complete remount when project changes
  useEffect(() => {
    console.log(`[ProjectPage] URL changed to: ${pathname}, project: ${resolvedParams.project}`)

    // If the project changed, unmount old workspace first
    if (mountedProjectId !== resolvedParams.project) {
      console.log(`[ProjectPage] Project changed from ${mountedProjectId} to ${resolvedParams.project}, forcing unmount`)
      setMountedProjectId(null)

      // Then mount new workspace after a microtask
      queueMicrotask(() => {
        setMountedProjectId(resolvedParams.project)
        console.log(`[ProjectPage] MOUNTED workspace for project: ${resolvedParams.project}`)
      })
    }

    return () => {
      console.log(`[ProjectPage] CLEANUP for project: ${resolvedParams.project}`)
      setMountedProjectId(null)
    }
  }, [pathname, resolvedParams.project, mountedProjectId])

  // Only render workspace when mountedProjectId matches current project
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {mountedProjectId === resolvedParams.project && (
        <WorkspaceLayout key={mountedProjectId} projectId={mountedProjectId} />
      )}
    </div>
  )
}
