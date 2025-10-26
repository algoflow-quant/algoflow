import { use } from 'react'
import MembersManager from "@/features/(lab)/organization_members/components/MembersManager"

export default function MembersPage({
  params,
}: {
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = use(params)

  return (
    <MembersManager organizationId={organizationId} />
  )
}
