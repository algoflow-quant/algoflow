"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

interface RenameTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamName: string
  teamDescription?: string
  onSubmit: (name: string, description?: string) => Promise<void>
}

export function RenameTeamDialog({
  open,
  onOpenChange,
  teamName,
  teamDescription,
  onSubmit,
}: RenameTeamDialogProps) {
  const [name, setName] = useState(teamName)
  const [description, setDescription] = useState(teamDescription || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await onSubmit(name, description)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err) || "Failed to update team")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Team</DialogTitle>
          <DialogDescription>Update your team name and description</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="team-name">Team Name</FieldLabel>
              <Input
                id="team-name"
                type="text"
                placeholder="My Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="team-description">Description (optional)</FieldLabel>
              <Textarea
                id="team-description"
                placeholder="What does your team work on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </Field>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-brand-blue hover:bg-brand-blue-dark"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Team"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
