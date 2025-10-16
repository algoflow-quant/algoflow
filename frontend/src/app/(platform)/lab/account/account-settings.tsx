'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { IconUpload, IconX } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  email: string | null
  name: string | null
  username: string | null
  bio: string | null
  avatar_url: string | null
}

interface AccountSettingsProps {
  profile: Profile | null
}

export default function AccountSettings({ profile }: AccountSettingsProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
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
    if (!profile?.id) return

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
      // Create unique file name with user ID folder
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${Date.now()}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile in database
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })

      if (!response.ok) throw new Error('Failed to update profile')

      setAvatarUrl(publicUrl)
      toast.success('Avatar updated successfully')
      router.refresh()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    if (!profile?.id) return

    setUploading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: null }),
      })

      if (!response.ok) throw new Error('Failed to update profile')

      setAvatarUrl('')
      toast.success('Avatar removed')
      router.refresh()
    } catch {
      toast.error('Failed to remove avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update profile')
      }

      toast.success('Profile updated successfully')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    if (formData.name) {
      return formData.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return profile?.email?.[0]?.toUpperCase() || 'U'
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-8 md:p-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Manage your profile information and preferences
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border rounded-xl shadow-sm">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Avatar Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Profile Picture</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a profile picture or drag and drop
                </p>
              </div>
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24 border-2">
                  <AvatarImage src={avatarUrl} alt={formData.name || 'Avatar'} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
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
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                  >
                    <IconUpload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop an image, or{' '}
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
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeAvatar}
                      disabled={uploading}
                      className="mt-3"
                    >
                      <IconX className="h-4 w-4 mr-1" />
                      Remove Avatar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* Email Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Your email address is managed through your authentication provider
                </p>
              </div>
              <Input
                id="email"
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted/50 text-base h-11"
              />
            </div>

            <div className="border-t" />

            {/* Display Name Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-base font-semibold">Display Name</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  This is how your name will appear across the platform
                </p>
              </div>
              <Input
                id="name"
                type="text"
                placeholder="Enter your display name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-base h-11"
              />
            </div>

            <div className="border-t" />

            {/* Username Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-base font-semibold">Username</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Your unique identifier (3-30 characters, letters, numbers, - and _ only)
                </p>
              </div>
              <Input
                id="username"
                type="text"
                placeholder="your-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="text-base h-11 font-mono"
              />
            </div>

            <div className="border-t" />

            {/* Bio Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="bio" className="text-base font-semibold">Bio</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell others a bit about yourself
                </p>
              </div>
              <textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="flex min-h-[140px] w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Maximum 500 characters
                </p>
                <p className="text-sm text-muted-foreground font-medium">
                  {formData.bio.length}/500
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-6">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="h-11 px-8">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
