"use client"

import { use } from "react"
import { WorkspaceLayout } from "@/components/platform/editor/workspace-layout"

export default function ProjectPage({ params }: { params: Promise<{ team: string; project: string }> }) {
  const resolvedParams = use(params)

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Golden Layout workspace */}
      <WorkspaceLayout projectId={resolvedParams.project} />
    </div>
  )
}
