'use client'

import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Manage how you receive notifications.
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive email notifications for important updates.
            </p>
          </div>
          <Switch id="email-notifications" />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="member-updates">Member Updates</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when members join or leave your organizations.
            </p>
          </div>
          <Switch id="member-updates" />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="data-updates">Data Source Updates</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications about data source changes.
            </p>
          </div>
          <Switch id="data-updates" />
        </div>
      </div>
    </div>
  )
}
