import { DotPattern } from '@/components/ui/dot-pattern'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh w-full flex-col p-6 md:p-10">
      {/* Background Dot Pattern - behind everything */}
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        className={cn(
          'absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]'
        )}
      />

      {/* Header with back button */}
      <header className="relative z-10 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      {/* Content centered */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
