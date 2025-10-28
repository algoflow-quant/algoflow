'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCurrentUser } from '@/features/organizations/members/queries/useCurrentUser'
import { updateFullName } from '../../actions/updateProfile'
import { updatePassword } from '../../actions/updatePassword'
import { deleteAccount } from '../../actions/deleteAccount'
import { uploadAvatar } from '../../actions/uploadAvatar'
import { removeAvatar } from '../../actions/removeAvatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function AccountSettings() {
  const { user } = useCurrentUser()
  const [supabase] = useState(() => createClient())
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)

  const userInitials =
    user?.user_metadata?.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase() || user?.email?.[0].toUpperCase() || 'U'

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      await uploadAvatar(formData)
      // Refresh auth state to show new avatar
      await supabase.auth.refreshSession()
      setIsUploading(false)
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload avatar')
      setIsUploading(false)
    }
  }

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true)
    try {
      if (fullName !== user?.user_metadata?.full_name) {
        await updateFullName(fullName)
        // Refresh auth state to show new name
        await supabase.auth.refreshSession()
      }
      setIsUpdatingProfile(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert(error instanceof Error ? error.message : 'Failed to update profile')
      setIsUpdatingProfile(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      alert('Please enter your current password')
      return
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters')
      return
    }

    setIsUpdatingPassword(true)
    try {
      await updatePassword(currentPassword, newPassword)
      setPasswordDialogOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      alert('Password updated successfully')
    } catch (error) {
      console.error('Failed to update password:', error)
      alert(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      alert('Please enter your password to confirm deletion')
      return
    }

    setIsDeletingAccount(true)
    try {
      await deleteAccount(deletePassword)
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete account')
      setIsDeletingAccount(false)
      setDeletePassword('')
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      await handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/gif,image/webp'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        await handleFileUpload(file)
      }
    }
    input.click()
  }

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true)
    try {
      await removeAvatar()
      // Refresh auth state to clear avatar
      await supabase.auth.refreshSession()
      setIsRemovingAvatar(false)
    } catch (error) {
      console.error('Failed to remove avatar:', error)
      alert(error instanceof Error ? error.message : 'Failed to remove avatar')
      setIsRemovingAvatar(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <Separator />

      {/* Profile Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-6">
          <div
            className={`relative group cursor-pointer ${isDragging ? 'ring-2 ring-primary' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
          >
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt={fullName || user?.email} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              ) : (
                <Upload className="h-6 w-6 text-white" />
              )}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <Label>Profile Picture</Label>
            <p className="text-sm text-muted-foreground">
              Click the avatar or drag and drop an image to upload.
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum file size: 5MB. Accepted formats: JPEG, PNG, GIF, WEBP.
            </p>
            {user?.user_metadata?.avatar_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={isRemovingAvatar}
              >
                {isRemovingAvatar ? 'Removing...' : 'Remove Picture'}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="full-name">Full Name</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={user?.user_metadata?.full_name || 'Enter your full name'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            defaultValue={user?.email || ''}
            disabled
          />
          <p className="text-xs text-muted-foreground">
            Your email address cannot be changed.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-id">User ID</Label>
          <Input id="user-id" defaultValue={user?.id || ''} disabled />
          <p className="text-xs text-muted-foreground">
            Your unique user identifier.
          </p>
        </div>

        <Button
          onClick={handleUpdateProfile}
          disabled={isUpdatingProfile}
        >
          {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Separator />

      {/* Password Section */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium">Password</h4>
          <p className="text-sm text-muted-foreground">
            Change your password to keep your account secure.
          </p>
        </div>
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Change Password</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and a new password. Minimum 8 characters.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPasswordDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Danger Zone */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove all your data from our servers, including all
                organizations you own.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="delete-password">Confirm your password</Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletePassword('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
