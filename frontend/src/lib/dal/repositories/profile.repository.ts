import { Repository } from '../base/repository'
import { requireAuthorization } from '@/lib/abac/authorizer'
import { ValidationError } from '../utils/errors'
import type { profiles } from '@/generated/prisma'
import { createServiceRoleClient } from '@/lib/supabase/server'

export class ProfileRepository extends Repository {
  // ========== READ OPERATIONS ==========

  // Get profile (ABAC controls which fields user can access)
  async getProfile(profileId: string): Promise<profiles | null> {
    // ABAC check - can user read this profile?
    requireAuthorization({
      user: this.userContext,
      action: 'read',
      resource: { type: 'profile', id: profileId, ownerId: profileId },
    })

    // Query database - ABAC controls field-level access in application logic
    return await this.prisma.profiles.findUnique({
      where: { id: profileId },
    })
  }

  // Get profile with private fields (email, role, last_seen_at)
  // Only owner or admin can see private fields
  async getProfileWithPrivateFields(userId: string): Promise<profiles | null> {
    // ABAC check - only owner or admin can read private fields
    requireAuthorization({
      user: this.userContext,
      action: 'read',
      resource: {
        type: 'profile',
        id: userId,
        ownerId: userId,
        fieldsBeingRead: ['email', 'role', 'last_seen_at']
      },
    })

    return await this.prisma.profiles.findUnique({
      where: { id: userId },
    })
  }

  // ========== UPDATE OPERATIONS ==========

  // Update profile basic fields (username, full_name, bio)
  async updateProfile(data: {
    username?: string
    full_name?: string
    bio?: string
  }): Promise<profiles> {
    // ABAC check - only owner can update their profile
    requireAuthorization({
      user: this.userContext,
      action: 'update',
      resource: {
        type: 'profile',
        id: this.userContext.id,
        ownerId: this.userContext.id,
      },
    })

    // Validate username uniqueness if provided
    if (data.username) {
      const existing = await this.prisma.profiles.findFirst({
        where: {
          username: data.username,
          id: { not: this.userContext.id },
        },
      })

      if (existing) {
        throw new ValidationError('Username already taken')
      }
    }

    // Update profile
    return await this.prisma.profiles.update({
      where: { id: this.userContext.id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    })
  }

  // Update last_seen_at timestamp (for presence system)
  async updateLastSeen(): Promise<void> {
    // ABAC check - only owner can update their last_seen_at
    requireAuthorization({
      user: this.userContext,
      action: 'update',
      resource: {
        type: 'profile',
        id: this.userContext.id,
        ownerId: this.userContext.id,
      },
    })

    // Update last_seen_at
    await this.prisma.profiles.update({
      where: { id: this.userContext.id },
      data: {
        last_seen_at: new Date(),
        updated_at: new Date(),
      },
    })
  }

  // ========== AVATAR OPERATIONS ==========

  // Upload avatar to Supabase Storage and update profile
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    // ABAC check - only owner can upload their avatar
    requireAuthorization({
      user: this.userContext,
      action: 'update',
      resource: {
        type: 'profile',
        id: this.userContext.id,
        ownerId: this.userContext.id,
      },
    })

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new ValidationError('Invalid file type. Allowed: JPEG, PNG, GIF, WEBP')
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new ValidationError('File size must be less than 5MB')
    }

    // Use service role client for storage operations
    const supabase = createServiceRoleClient()

    // Get file extension
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${this.userContext.id}/avatar-${timestamp}.${fileExt}`

    // Delete old avatars if exist
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(this.userContext.id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f: { name: string }) => `${this.userContext.id}/${f.name}`)
      await supabase.storage.from('avatars').remove(filesToDelete)
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Avatar upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(fileName)

    // Update profile with new avatar URL
    await this.prisma.profiles.update({
      where: { id: this.userContext.id },
      data: {
        avatar_url: publicUrl,
        updated_at: new Date(),
      },
    })

    return { avatarUrl: publicUrl }
  }

  // Remove avatar from storage and profile
  async removeAvatar(): Promise<void> {
    // ABAC check - only owner can remove their avatar
    requireAuthorization({
      user: this.userContext,
      action: 'update',
      resource: {
        type: 'profile',
        id: this.userContext.id,
        ownerId: this.userContext.id,
      },
    })

    // Use service role client for storage operations
    const supabase = createServiceRoleClient()

    // Delete all avatars from storage
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(this.userContext.id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f: { name: string }) => `${this.userContext.id}/${f.name}`)
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove(filesToDelete)

      if (deleteError) {
        throw new Error(`Failed to remove avatar: ${deleteError.message}`)
      }
    }

    // Remove avatar URL from profile
    await this.prisma.profiles.update({
      where: { id: this.userContext.id },
      data: {
        avatar_url: null,
        updated_at: new Date(),
      },
    })
  }

  // ========== DELETE OPERATIONS ==========

  // Delete user account (soft delete by marking as deleted)
  async deleteAccount(): Promise<void> {
    // ABAC check - only owner can delete their account
    requireAuthorization({
      user: this.userContext,
      action: 'delete',
      resource: {
        type: 'profile',
        id: this.userContext.id,
        ownerId: this.userContext.id,
      },
    })

    // TODO: Implement soft delete or actual deletion based on requirements
    // For now, we'll mark the account as deleted by updating a flag
    // This requires adding a 'deleted_at' field to profiles table

    throw new Error('Account deletion not yet implemented - requires schema changes')
  }
}
