'use client'

import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'

export function AccessibilitySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Accessibility</h3>
        <p className="text-sm text-muted-foreground">
          Customize accessibility features for better usability.
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="reduce-motion">Reduce Motion</Label>
            <p className="text-sm text-muted-foreground">
              Minimize animations and transitions.
            </p>
          </div>
          <Switch id="reduce-motion" />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="high-contrast">High Contrast</Label>
            <p className="text-sm text-muted-foreground">
              Increase contrast for better visibility.
            </p>
          </div>
          <Switch id="high-contrast" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="font-size">Font Size</Label>
          <Slider
            id="font-size"
            min={12}
            max={20}
            step={1}
            defaultValue={[14]}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Adjust the base font size (12px - 20px).
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="keyboard-nav">Enhanced Keyboard Navigation</Label>
            <p className="text-sm text-muted-foreground">
              Show focus indicators and keyboard shortcuts.
            </p>
          </div>
          <Switch id="keyboard-nav" />
        </div>
      </div>
    </div>
  )
}
