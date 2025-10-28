'use client'

import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

export function PrivacySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Privacy & Security</h3>
        <p className="text-sm text-muted-foreground">
          Control your privacy and security settings.
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-online-status">Show Online Status</Label>
            <p className="text-sm text-muted-foreground">
              Let others see when you're online.
            </p>
          </div>
          <Switch id="show-online-status" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-last-seen">Show Last Seen</Label>
            <p className="text-sm text-muted-foreground">
              Display the last time you were active.
            </p>
          </div>
          <Switch id="show-last-seen" />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="profile-visibility">Profile Visibility</Label>
            <p className="text-sm text-muted-foreground">
              Make your profile visible to organization members.
            </p>
          </div>
          <Switch id="profile-visibility" defaultChecked />
        </div>
      </div>
    </div>
  )
}
