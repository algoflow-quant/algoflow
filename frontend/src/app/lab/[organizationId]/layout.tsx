import OrgSidebar from '@/features/(lab)/layout/OrgSidebar'

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full">
      <OrgSidebar />
      <main className="flex-1 ml-16">
        {children}
      </main>
    </div>
  )
}
