'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

const notebookCells = [
  { id: 1, code: 'data = load_market_data()', hasOutput: false },
  { id: 2, code: 'analyze_trends(data)', hasOutput: false },
  { id: 3, code: 'plot_backtest_results()', hasOutput: true, isPlot: true },
]

export function ResearchAnimation() {
  const [isHovered, setIsHovered] = useState(false)
  const [executedCells, setExecutedCells] = useState<number[]>([])

  useEffect(() => {
    if (!isHovered) {
      setExecutedCells([])
      return
    }

    // Execute cells one by one
    let currentCell = 0
    const interval = setInterval(() => {
      if (currentCell < notebookCells.length) {
        const cellId = notebookCells[currentCell]?.id
        if (cellId) {
          setExecutedCells(prev => [...prev, cellId])
        }
        currentCell++
      } else {
        clearInterval(interval)
      }
    }, 800)

    return () => clearInterval(interval)
  }, [isHovered])

  return (
    <div
      className="absolute inset-0 flex flex-col p-6 pb-20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Notebook header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-mono text-muted-foreground">
          market_analysis.ipynb
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
      </div>

      {/* Notebook cells */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {notebookCells.map((cell, index) => {
          const isExecuted = executedCells.includes(cell.id)
          const isExecuting = executedCells.length === index
          const showPlot = executedCells.includes(3) // Plot cell is id 3

          return (
            <motion.div
              key={cell.id}
              className="border border-border rounded-md overflow-hidden bg-background/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: showPlot ? -50 : 0
              }}
              transition={{
                delay: index * 0.1,
                y: { duration: 0.5, ease: 'easeInOut' }
              }}
            >
              {/* Cell header */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
                <div className="text-[10px] font-mono text-muted-foreground">
                  [
                  {isExecuting && (
                    <motion.span
                      className="text-white"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ★
                    </motion.span>
                  )}
                  {isExecuted && !isExecuting && (index + 1)}
                  {!isExecuted && !isExecuting && ' '}
                  ]
                </div>
                {isExecuted && !isExecuting && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <Check className="w-3 h-3 text-emerald-500" />
                  </motion.div>
                )}
              </div>

              {/* Cell code */}
              <div className="px-3 py-2">
                <pre className="text-[11px] font-mono text-muted-foreground">
                  {cell.code}
                </pre>
              </div>

              {/* Cell output */}
              <AnimatePresence>
                {isExecuted && cell.hasOutput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-border bg-muted/20 overflow-hidden"
                  >
                    {cell.isPlot ? (
                      <div className="p-2">
                        {/* Line chart visualization */}
                        <svg className="w-full h-16" viewBox="0 0 200 60" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          {/* Grid lines */}
                          {[0, 20, 40, 60].map((y) => (
                            <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                          ))}

                          {/* Area under line */}
                          <motion.path
                            d="M0,45 L15,40 L30,48 L45,35 L60,38 L75,30 L90,32 L105,25 L120,28 L135,20 L150,18 L165,15 L180,12 L195,10 L195,60 L0,60 Z"
                            fill="url(#lineGradient)"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                          />

                          {/* Line */}
                          <motion.path
                            d="M0,45 L15,40 L30,48 L45,35 L60,38 L75,30 L90,32 L105,25 L120,28 L135,20 L150,18 L165,15 L180,12 L195,10"
                            stroke="rgb(16, 185, 129)"
                            strokeWidth="2"
                            fill="none"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
                          />
                        </svg>
                        <div className="text-[9px] font-mono text-muted-foreground mt-1 text-center">
                          Cumulative Returns
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2">
                        <div className="text-[10px] font-mono text-emerald-500">
                          ✓ Executed successfully
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
