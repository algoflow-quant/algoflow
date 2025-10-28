import { buildUserContextWithOrg } from '@/lib/dal/context'
import { redirect } from 'next/navigation'
import { RoleProvider } from '@/providers/RoleProvider'
import OrganizationContent from './OrganizationContent'

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = await params

  // Fetch user role on server
  const userContext = await buildUserContextWithOrg(organizationId)

  // Redirect if not authenticated or not a member
  if (!userContext || !userContext.organizationRole) {
    redirect('/dashboard')
  }

  return (
    <RoleProvider
      value={{
        globalRole: userContext.globalRole,
        organizationRole: userContext.organizationRole,
        organizationId,
      }}
    >
      <OrganizationContent>{children}</OrganizationContent>
    </RoleProvider>
  )
}
