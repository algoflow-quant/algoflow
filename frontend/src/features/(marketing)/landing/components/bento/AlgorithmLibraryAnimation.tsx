'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface Algorithm {
  name: string
  category: string
  returns: string
  color: string
}

const algorithms: Algorithm[] = [
  { name: 'Mean Reversion', category: 'Statistical Arbitrage', returns: '+24.3%', color: 'text-emerald-400' },
  { name: 'Momentum Breakout', category: 'Trend Following', returns: '+18.7%', color: 'text-blue-400' },
  { name: 'Pairs Trading', category: 'Market Neutral', returns: '+12.1%', color: 'text-purple-400' },
  { name: 'Grid Trading', category: 'Range Bound', returns: '+15.8%', color: 'text-cyan-400' },
  { name: 'RSI Divergence', category: 'Technical', returns: '+21.4%', color: 'text-orange-400' },
  { name: 'MACD Crossover', category: 'Trend Following', returns: '+19.2%', color: 'text-blue-400' },
  { name: 'Bollinger Bands', category: 'Volatility', returns: '+16.5%', color: 'text-purple-400' },
  { name: 'Moving Average', category: 'Trend Following', returns: '+14.8%', color: 'text-cyan-400' },
  { name: 'Stochastic Oscillator', category: 'Momentum', returns: '+17.6%', color: 'text-emerald-400' },
]

// Group algorithms into pages of 3
const pages: Algorithm[][] = []
for (let i = 0; i < algorithms.length; i += 3) {
  pages.push(algorithms.slice(i, i + 3))
}

export default function AlgorithmLibraryAnimation() {
  const [currentPage, setCurrentPage] = useState(0)
  const [cursorPosition, setCursorPosition] = useState({ x: 235, y: 285 })
  const [isHovered, setIsHovered] = useState(false)
  const [direction, setDirection] = useState(1) // 1 for forward, -1 for backward

  // Simulate cursor movement and pagination
  useEffect(() => {
    if (!isHovered) {
      // Reset to initial state when hover ends
      setCurrentPage(0)
      setCursorPosition({ x: 150, y: 110 })
      setDirection(1)
      return
    }

    let currentStep = 0

    // Add noise to make movement more natural
    const noise = (magnitude = 8) => (Math.random() - 0.5) * magnitude

    // Create natural mouse movement hovering around strategies then moving to button
    const generateCurvePath = () => {
      const buttonX = direction === 1 ? 200 : 124 // Position of pagination buttons
      const buttonY = 265 // Position of pagination buttons

      // Random positions around the strategy cards
      const randomPoints = []
      for (let i = 0; i < 6; i++) {
        randomPoints.push({
          x: 80 + Math.random() * 140, // Random x between 80-220
          y: 100 + Math.random() * 120, // Random y between 100-220
        })
      }

      return [
        ...randomPoints,
        // Move toward button
        { x: 180 + noise(10), y: 260 + noise(10) },
        { x: 170 + noise(8), y: 290 + noise(8) },
        { x: buttonX + noise(3), y: buttonY + noise(3) }, // Arrive at pagination button
      ]
    }

    const cursorPath = generateCurvePath()

    const clickButton = () => {
      // Click after cursor arrives
      setTimeout(() => {
        setCurrentPage((prev) => {
          const next = prev + direction

          // Switch direction at boundaries
          if (next >= pages.length - 1) {
            setDirection(-1)
          } else if (next <= 0) {
            setDirection(1)
          }

          return next
        })
      }, 300)
    }

    const interval = setInterval(() => {
      if (currentStep < cursorPath.length) {
        // Move through the natural path
        setCursorPosition(cursorPath[currentStep])

        // Click when reaching the button
        if (currentStep === cursorPath.length - 1) {
          clickButton()
        }
      } else {
        // Reset cycle - regenerate path with new noise
        currentStep = -1
        const newPath = generateCurvePath()
        cursorPath.length = 0
        cursorPath.push(...newPath)
      }
      currentStep++
    }, 350)

    return () => clearInterval(interval)
  }, [isHovered, direction])

  const visibleAlgos = pages[currentPage] || []

  return (
    <div
      className="algorithm-library-animation absolute inset-0 flex flex-col gap-3 p-4 pb-24"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setCurrentPage(0)
        setCursorPosition({ x: 0, y: 300 })
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>
        <div className="text-xs text-white/40">1000+ Strategies</div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="text-sm text-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">
              Search algorithms...
            </div>
          </div>
        </div>
      </div>

      {/* Algorithm list with pagination */}
      <div className="flex flex-col gap-2 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-2"
          >
            {visibleAlgos.map((algo: Algorithm) => (
              <div
                key={algo.name}
                className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{algo.name}</div>
                    <div className="text-[10px] text-white/40 mt-0.5 truncate">{algo.category}</div>
                  </div>
                  <div className={`text-xs font-semibold ${algo.color} flex-shrink-0`}>
                    {algo.returns}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination arrows */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3, delay: isHovered ? 0.2 : 0 }}
        className="flex items-center justify-center gap-3"
      >
        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 transition-colors pointer-events-none">
          <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </div>

        {/* Page indicators */}
        <div className="flex gap-1">
          {pages.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                index === currentPage ? 'bg-white/60' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 transition-colors pointer-events-none">
          <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </motion.div>

      {/* Animated Cursor - same style as strategy builder */}
      <motion.div
        className="absolute w-4 h-4 pointer-events-none z-50"
        animate={{ x: cursorPosition.x, y: cursorPosition.y }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      </motion.div>
    </div>
  )
}
