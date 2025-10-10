import { LoginForm } from "@/components/login-form"
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-6 md:p-10 overflow-hidden bg-gradient-to-br from-background via-brand-blue/5 to-background">
      <InteractiveGridPattern
        width={50}
        height={50}
        squares={[60, 60]}
        className="absolute inset-0 w-full h-full [mask-image:radial-gradient(1000px_circle_at_center,white,transparent)]"
        squaresClassName="fill-brand-blue/40 stroke-brand-blue/60 hover:fill-brand-blue/70 hover:stroke-brand-blue"
      />
      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
