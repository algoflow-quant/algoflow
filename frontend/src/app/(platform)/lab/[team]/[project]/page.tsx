"use client"

import { use } from "react"
import { WorkspaceLayout } from "@/components/platform/editor/workspace-layout"

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'

export default function ProjectPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const resolvedParams = use(params)

  console.log(`[ProjectPage] Rendering for project: ${resolvedParams.project}`)

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Golden Layout workspace - key forces remount when project changes */}
      <WorkspaceLayout key={resolvedParams.project} projectId={resolvedParams.project} />
    </div>
  )
}
