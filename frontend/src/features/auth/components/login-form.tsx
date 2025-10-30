'use client'

import { useFormStatus } from "react-dom"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { login } from "@/features/auth"
import LoadingAnimation from "@/components/shared/LoadingAnimation"
import { AlertCircle } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      formAction={login}
      className="w-full"
      disabled={pending}
    >
      {pending ? (
        <div className="flex items-center gap-2">
          <LoadingAnimation size={16} color="currentColor" />
          Logging in...
        </div>
      ) : (
        'Login'
      )}
    </Button>
  )
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-muted/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{decodeURIComponent(error)}</span>
            </div>
          )}
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <SubmitButton />
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/signup" className="underline">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
