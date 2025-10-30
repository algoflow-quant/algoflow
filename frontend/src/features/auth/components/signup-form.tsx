'use client'

import { useFormStatus } from "react-dom"
import { useSearchParams } from "next/navigation"
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
import Link from "next/link"
import { signup } from "@/features/auth"
import LoadingAnimation from "@/components/shared/LoadingAnimation"
import { AlertCircle } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      formAction={signup}
      className="w-full"
      disabled={pending}
    >
      {pending ? (
        <div className="flex items-center gap-2">
          <LoadingAnimation size={16} color="currentColor" />
          Creating account...
        </div>
      ) : (
        'Create Account'
      )}
    </Button>
  )
}

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <Card className="bg-muted/50 backdrop-blur-sm" {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
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
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input id="name" name="name" type="text" placeholder="John Doe" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input id="username" name="username" type="text" placeholder="johndoe" required />
              <FieldDescription>
                This will be your unique identifier on the platform.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" required />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input id="confirm-password" type="password" required />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <SubmitButton />
                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/login" className="underline">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
