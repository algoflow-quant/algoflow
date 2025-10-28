'use client'

import LoadingAnimation from './LoadingAnimation'

interface LoadingOverlayProps {
  isLoading: boolean
  size?: number
  color?: string
}

/**
 * Full-screen loading overlay with backdrop blur
 * Shows a centered loading spinner when navigation is happening
 */
export default function LoadingOverlay({
  isLoading,
  size = 80,
  color = '#3b82f6',
}: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className="absolute inset-0 min-h-[calc(100vh-53px)] bg-background/95 backdrop-blur-sm z-30 flex items-center justify-center pointer-events-none">
      <div className="-mt-[52px]">
        <LoadingAnimation size={size} color={color} />
      </div>
    </div>
  )
}
