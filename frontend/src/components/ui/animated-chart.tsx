'use client'

import { motion } from "motion/react"

interface AnimatedChartProps {
  color: string
  gradientId: string
  linePath: string
  areaPath: string
  label: string
  height?: number
  strokeWidth?: number
  animationDelay?: number
  animationDuration?: number
}

export function AnimatedChart({
  color,
  gradientId,
  linePath,
  areaPath,
  label,
  height = 200,
  strokeWidth = 2,
  animationDelay = 0.5,
  animationDuration = 2,
}: AnimatedChartProps) {
  const viewBoxHeight = height * 0.75
  const gridLines = Array.from({ length: 5 }, (_, i) => (viewBoxHeight / 4) * i)

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden p-6">
      <svg className={`w-full h-[${height}px]`} viewBox={`0 0 400 ${viewBoxHeight}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        ))}

        {/* Area under line */}
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: animationDelay, duration: 0.8 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: animationDelay + 0.3, duration: animationDuration, ease: 'easeOut' }}
        />
      </svg>
      <div className={`text-center mt-2 ${height > 250 ? 'text-lg' : 'text-sm'} font-mono text-muted-foreground`}>
        {label}
      </div>
    </div>
  )
}
