'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// Each candle calculated to connect properly:
// Green candles: bottom offset, grows upward (height added to offset = top)
// Red candles: bottom offset (top of prev green - height), grows downward from top
const barData = [
  { height: 8.3, offset: 20, isDark: false },           // Green: 20 to 28.3
  { height: 7.2, offset: 28.3, isDark: false },         // Green: 28.3 to 35.5
  { height: 2.1, offset: 33.4, isDark: true },          // Red: 33.4 to 35.5 (top at 35.5)
  { height: 5.5, offset: 33.4, isDark: false },         // Green: 33.4 to 38.9
  { height: 9.7, offset: 38.9, isDark: false },         // Green: 38.9 to 48.6
  { height: 4.2, offset: 44.4, isDark: true },          // Red: 44.4 to 48.6 (top at 48.6)
  { height: 12.1, offset: 44.4, isDark: false },        // Green: 44.4 to 56.5
  { height: 8, offset: 48.5, isDark: true },            // Red: 48.5 to 56.5 (top at 56.5)
  { height: 17.5, offset: 48.5, isDark: false },        // Green: 48.5 to 66
  { height: 4.2, offset: 66, isDark: false },           // Green: 66 to 70.2
  { height: 2.4, offset: 70.2, isDark: false },         // Green: 70.2 to 72.6
  { height: 8.5, offset: 72.6, isDark: false },         // Green: 72.6 to 81.1
  { height: 11.5, offset: 69.6, isDark: true },         // Red: 69.6 to 81.1 (top at 81.1)
  { height: 16.6, offset: 69.6, isDark: false },        // Green: 69.6 to 86.2
  { height: 4, offset: 82.2, isDark: true },            // Red: 82.2 to 86.2 (top at 86.2)
  { height: 6.6, offset: 75.6, isDark: true },          // Red: 75.6 to 82.2 (top at 82.2)
  { height: 2.2, offset: 75.6, isDark: false },         // Green: 75.6 to 77.8
  { height: 2.8, offset: 75, isDark: true },            // Red: 75 to 77.8 (top at 77.8)
  { height: 10.6, offset: 75, isDark: false },          // Green: 75 to 85.6
]

export function BacktesterAnimation() {
  const [isHovered, setIsHovered] = useState(false)
  const [visibleBars, setVisibleBars] = useState(6)
  const [displayProfit, setDisplayProfit] = useState('0.0')

  useEffect(() => {
    if (!isHovered) {
      // Fast reverse animation when hover ends
      const reverseInterval = setInterval(() => {
        setVisibleBars((current) => {
          if (current > 6) {
            return current - 1
          } else {
            clearInterval(reverseInterval)
            return 6
          }
        })
      }, 50) // Much faster reverse
      return () => clearInterval(reverseInterval)
    }

    let current = 6
    const interval = setInterval(() => {
      current++
      if (current <= barData.length) {
        setVisibleBars(current)
      } else {
        clearInterval(interval)
      }
    }, 300)

    return () => clearInterval(interval)
  }, [isHovered])

  // Update display profit when visible bars change
  useEffect(() => {
    setDisplayProfit(calculateProfit())
  }, [visibleBars])

  // Calculate profit percentage based on visible bars
  const calculateProfit = (): string => {
    if (visibleBars === 0) return '0.0'

    // Track cumulative price movement through candles
    let currentPrice = 20 // Starting price
    for (let i = 0; i < visibleBars; i++) {
      const bar = barData[i]
      if (bar.isDark) {
        // Red candle: price goes down
        currentPrice -= bar.height
      } else {
        // Green candle: price goes up
        currentPrice += bar.height
      }
    }

    const profit = ((currentPrice - 20) / 20 * 100)
    return profit.toFixed(1)
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-8 pb-24 pt-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Strategy name overlay */}
      <div className="absolute top-3 left-3 text-xs font-mono text-muted-foreground">
        <div className="font-semibold text-foreground">Mean Reversion Strategy</div>
        <div className="text-[10px] mt-0.5">Backtest: Jan 2024 - Oct 2024</div>
      </div>

      <div className="w-full h-[78%] relative">

        {/* Chart grid lines */}
        <div className="absolute inset-0">
          {[0, 25, 50, 75].map((percent) => (
            <div
              key={percent}
              className="absolute w-full h-px bg-border/20"
              style={{ bottom: `${percent}%` }}
            />
          ))}
        </div>

        {/* Candlesticks */}
        {barData.slice(0, Math.max(visibleBars, 6)).map((bar, index) => {
          const leftPosition = (index * 1.9) + (index * 3)
          const isVisible = index < visibleBars

          return (
            <div
              key={index}
              className="absolute overflow-hidden"
              style={{
                left: `${leftPosition}%`,
                bottom: `${bar.offset}%`,
                width: '3%',
                height: `${bar.height}%`,
              }}
            >
              <motion.div
                className={`absolute inset-0 w-full h-full ${
                  bar.isDark ? 'bg-red-500/70' : 'bg-emerald-500/70'
                }`}
                initial={{
                  opacity: index < 6 ? 1 : 0,
                  y: index < 6 ? '0%' : (bar.isDark ? '-100%' : '100%'),
                }}
                animate={
                  isVisible
                    ? { opacity: 1, y: '0%' }
                    : {
                        opacity: index < 6 ? 1 : 0,
                        y: index < 6 ? '0%' : (bar.isDark ? '-100%' : '100%')
                      }
                }
                transition={{
                  duration: isVisible ? 0.5 : 0.3,
                  delay: isVisible ? index * 0.1 : 0,
                  ease: 'easeOut',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Stats overlay - always visible */}
      <motion.div
        className="absolute top-3 right-3 flex flex-col items-end gap-0.5 text-xs font-mono"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          key={visibleBars}
          className={`font-semibold ${parseFloat(displayProfit) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.2 }}
        >
          {parseFloat(displayProfit) >= 0 ? '+' : ''}{displayProfit}%
        </motion.div>
        <div className="text-muted-foreground text-[10px]">Return</div>
      </motion.div>
    </div>
  )
}
