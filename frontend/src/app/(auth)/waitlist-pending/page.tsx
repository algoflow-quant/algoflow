import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function WaitlistPendingPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-6 md:p-10 overflow-hidden bg-gradient-to-br from-background via-brand-blue/5 to-background">
      <InteractiveGridPattern
        width={50}
        height={50}
        squares={[60, 60]}
        className="absolute inset-0 w-full h-full [mask-image:radial-gradient(1000px_circle_at_center,white,transparent)]"
        squaresClassName="fill-brand-blue/40 stroke-brand-blue/60 hover:fill-brand-blue/70 hover:stroke-brand-blue"
      />
      <div className="relative z-10 w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>You're on the waitlist</CardTitle>
            <CardDescription>
              Your account is pending approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Thank you for signing up for AlgoFlow! Your account has been created and is currently pending approval.
            </p>
            <p className="text-sm text-muted-foreground">
              We'll notify you via email once your account has been approved and you can start building quantitative trading strategies.
            </p>
            <div className="pt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
