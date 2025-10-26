'use client'

import LoadingAnimation from './LoadingAnimation'

interface LoadingOverlayProps {
  size?: number
  color?: string
}

export default function LoadingOverlay({ size = 80, color = '#3b82f6' }: LoadingOverlayProps) {
  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <LoadingAnimation size={size} color={color} />
    </div>
  )
}
