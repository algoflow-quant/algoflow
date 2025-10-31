'use client'

import React from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface LineChartProps {
  /** Path data for the line */
  pathData: string
  /** Color of the line (rgb format like "rgb(16, 185, 129)") */
  color: string
  /** Label to display below the chart */
  label: string
  /** Optional class name for the container */
  className?: string
  /** Height of the SVG viewBox */
  viewBoxHeight?: number
  /** Width of the SVG viewBox */
  viewBoxWidth?: number
  /** Height of the SVG element */
  svgHeight?: string
  /** Delay before animation starts */
  animationDelay?: number
  /** Duration of the line drawing animation */
  animationDuration?: number
  /** Stroke width of the line */
  strokeWidth?: number
  /** Label text size */
  labelSize?: 'sm' | 'md' | 'lg'
  /** Padding inside the chart container */
  padding?: string
}

export function AnimatedLineChart({
  pathData,
  color,
  label,
  className,
  viewBoxHeight = 150,
  viewBoxWidth = 400,
  svgHeight = '200px',
  animationDelay = 0.5,
  animationDuration = 2,
  strokeWidth = 2,
  labelSize = 'sm',
  padding = 'p-6',
}: LineChartProps) {
  // Generate unique gradient ID using React's useId hook
  const gradientId = React.useId()

  // Create the filled path by adding closing points
  const filledPathData = `${pathData} L${viewBoxWidth},${viewBoxHeight} L0,${viewBoxHeight} Z`

  // Calculate grid lines
  const gridLines = Array.from({ length: 5 }, (_, i) => (i * viewBoxHeight) / 4)

  const labelSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  return (
    <div className={cn('bg-background border border-border rounded-lg overflow-hidden', padding, className)}>
      <svg
        className="w-full"
        style={{ height: svgHeight }}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>


        {/* Line */}
        <motion.path
          d={pathData}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: animationDelay + 0.3, duration: animationDuration, ease: 'easeOut' }}
        />

        {/* Line shading */}
        <motion.path
          d={filledPathData}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: animationDelay, duration: 0.8 }}
        />

        
        {/* Grid lines */}
        {gridLines.map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2={viewBoxWidth}
            y2={y}
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.1"
          />
        ))}

      </svg>
      <div className={cn('text-center mt-2 font-mono text-muted-foreground', labelSizeClasses[labelSize])}>
        {label}
      </div>
    </div>
  )
}
