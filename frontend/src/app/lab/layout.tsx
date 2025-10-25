import SpaHeader from '@/features/(lab)/layout/SpaHeader'

export default function LabLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <SpaHeader />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
