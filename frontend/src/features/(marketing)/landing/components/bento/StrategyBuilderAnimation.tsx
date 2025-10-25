'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const codePatterns = {
  'strategy.py': [
    { width: '65%', delay: 0 },
    { width: '50%', delay: 0.03 },
    { width: '80%', delay: 0.06 },
    { width: '40%', delay: 0.09 },
    { width: '70%', delay: 0.12 },
    { width: '60%', delay: 0.15 },
    { width: '75%', delay: 0.18 },
    { width: '55%', delay: 0.21 },
  ],
  'backtest.py': [
    { width: '75%', delay: 0 },
    { width: '45%', delay: 0.03 },
    { width: '70%', delay: 0.06 },
    { width: '55%', delay: 0.09 },
    { width: '85%', delay: 0.12 },
    { width: '65%', delay: 0.15 },
    { width: '50%', delay: 0.18 },
    { width: '80%', delay: 0.21 },
  ],
  'indicators.py': [
    { width: '60%', delay: 0 },
    { width: '75%', delay: 0.03 },
    { width: '50%', delay: 0.06 },
    { width: '65%', delay: 0.09 },
    { width: '80%', delay: 0.12 },
    { width: '45%', delay: 0.15 },
    { width: '70%', delay: 0.18 },
    { width: '55%', delay: 0.21 },
  ],
  'data.py': [
    { width: '70%', delay: 0 },
    { width: '55%', delay: 0.03 },
    { width: '80%', delay: 0.06 },
    { width: '45%', delay: 0.09 },
    { width: '75%', delay: 0.12 },
    { width: '60%', delay: 0.15 },
    { width: '85%', delay: 0.18 },
    { width: '50%', delay: 0.21 },
  ],
}

export function StrategyBuilderAnimation() {
  const [activeFile, setActiveFile] = useState<keyof typeof codePatterns>('strategy.py')
  const [cursorPosition, setCursorPosition] = useState({ x: 180, y: 46 })
  const [isHovered, setIsHovered] = useState(false)

  const files: Array<keyof typeof codePatterns> = ['strategy.py', 'backtest.py', 'indicators.py', 'data.py']

  useEffect(() => {
    if (!isHovered) {
      // Reset to initial state when hover ends
      setActiveFile('strategy.py')
      setCursorPosition({ x: 180, y: 46 })
      return
    }

    // Immediately switch to second file on hover
    let currentIndex = 1
    setActiveFile(files[1])
    setCursorPosition({ x: 180, y: 46 + 1 * 44 })

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % files.length
      setActiveFile(files[currentIndex])

      // Animate cursor to file position - align with center of file button
      const yPosition = 46 + currentIndex * 44
      setCursorPosition({ x: 180, y: yPosition })
    }, 1400)

    return () => clearInterval(interval)
  }, [isHovered])

  return (
    <div
      className="absolute inset-0 flex flex-col p-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Menu Bar */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-xs font-mono text-muted-foreground">
            <span className="hover:text-foreground transition-colors cursor-pointer">File</span>
            <span className="text-muted-foreground/30">|</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Edit</span>
            <span className="text-muted-foreground/30">|</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">View</span>
            <span className="text-muted-foreground/30">|</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Run</span>
            <span className="text-muted-foreground/30">|</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Terminal</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
        </div>
        <div className="h-px bg-border" />
      </div>

      <div className="flex-1 flex justify-between">
        {/* File Tree */}
        <div className="w-1/3 relative flex flex-col h-full">
          <div className="text-xs font-mono text-muted-foreground mb-4">strategy/</div>
          <div className="space-y-2 flex-1">
            {files.map((file) => (
              <div
                key={file}
                className={`text-sm font-mono px-3 py-2 rounded transition-colors ${
                  activeFile === file ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                {file}
              </div>
            ))}
          </div>

          {/* Animated Cursor - always visible, gray color */}
          <motion.div
            className="absolute w-4 h-4 pointer-events-none"
            animate={{ x: cursorPosition.x, y: cursorPosition.y }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="text-muted-foreground">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
          </motion.div>
        </div>

        {/* Code Preview */}
        <div className="w-2/3 pl-6 flex flex-col h-full">
          <div className="space-y-4 flex-1">
            {codePatterns[activeFile].map((line, index) => (
              <motion.div
                key={`${activeFile}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: line.delay, duration: 0.3 }}
                style={{ width: line.width }}
                className="h-4 bg-muted-foreground/30 rounded"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
