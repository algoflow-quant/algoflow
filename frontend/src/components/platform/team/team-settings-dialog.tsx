"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IconUpload, IconX, IconTrash, IconAlertTriangle } from '@tabler/icons-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Separator } from '@/components/ui/separator'

interface TeamSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName: string
  teamDescription?: string | null
  teamAvatarUrl?: string | null
  onUpdate: (updates: { name: string; description?: string; avatar_url?: string | null }) => Promise<void>
  onDelete: () => Promise<void>
}

export function TeamSettingsDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  teamDescription,
  teamAvatarUrl,
  onUpdate,
  onDelete,
}: TeamSettingsDialogProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    name: teamName,
    description: teamDescription || '',
    avatarUrl: teamAvatarUrl || '',
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      await uploadAvatar(files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      await uploadAvatar(files[0])
    }
  }

  const uploadAvatar = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploading(true)

    try {
      // Create unique file name with team ID folder
      const fileExt = file.name.split('.').pop()
      const fileName = `team-${Date.now()}.${fileExt}`
      const filePath = `teams/${teamId}/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setFormData({ ...formData, avatarUrl: publicUrl })
      toast.success('Avatar uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = () => {
    setFormData({ ...formData, avatarUrl: '' })
    toast.success('Avatar will be removed when you save')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onUpdate({
        name: formData.name,
        description: formData.description || undefined,
        avatar_url: formData.avatarUrl || null,
      })
      toast.success('Team settings updated')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update team')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await onDelete()
      toast.success('Team deleted')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete team')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const getInitials = () => {
    return formData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Team Settings</DialogTitle>
          <DialogDescription>
            Manage your team information and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Avatar Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Team Picture</Label>
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20 border-2">
                <AvatarImage src={formData.avatarUrl} alt={formData.name} />
                <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                >
                  <IconUpload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Drag and drop, or{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
                {formData.avatarUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeAvatar}
                    disabled={uploading}
                    className="mt-2"
                  >
                    <IconX className="h-4 w-4 mr-1" />
                    Remove Picture
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-base font-semibold">
              Team Name
            </Label>
            <Input
              id="team-name"
              type="text"
              placeholder="Enter team name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-base h-11"
              required
            />
          </div>

          {/* Team Description */}
          <div className="space-y-2">
            <Label htmlFor="team-description" className="text-base font-semibold">
              Description
            </Label>
            <textarea
              id="team-description"
              placeholder="What does your team work on?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground text-right">
              {formData.description.length}/500
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <div>
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                >
                  <IconTrash className="h-4 w-4 mr-2" />
                  Delete Team
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <IconAlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Are you sure?</span>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    Yes, Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
