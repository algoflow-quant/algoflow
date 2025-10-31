'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface User {
  id: number
  name: string
  color: string
  avatar: string
}

const users: User[] = [
  { id: 1, name: 'Alex', color: 'bg-blue-500', avatar: 'A' },
  { id: 2, name: 'Sarah', color: 'bg-purple-500', avatar: 'S' },
  { id: 3, name: 'Mike', color: 'bg-emerald-500', avatar: 'M' },
]

export default function CollaborationAnimationAutoPlay() {
  const [showCode, setShowCode] = useState(false)
  const [activeCursors, setActiveCursors] = useState<{line: number, user: string, color: string, text: string}[]>([])
  const [clickCursor, setClickCursor] = useState({ x: 0, y: 0, show: false })
  const [showNotification, setShowNotification] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)

  const initialCodeLines = [
    'def calculate_strategy():',
    '    # Calculate moving averages',
    '    sma_20 = data.rolling(20).mean()',
    '    sma_50 = data.rolling(50).mean()',
    '    ',
    '    # Generate signals',
    '    signals = sma_20 > sma_50',
  ]

  const [codeLines, setCodeLines] = useState(initialCodeLines)

  useEffect(() => {
    if (hasPlayed) return

    setHasPlayed(true)

    // Show clicking mouse that opens the file
    const clickSequence = [
      { delay: 500, action: () => setClickCursor({ x: 120, y: 120, show: true }) },
      { delay: 1200, action: () => setShowCode(true) },
      { delay: 1500, action: () => setClickCursor({ x: 0, y: 0, show: false }) },
    ]

    // Simulate multiple people typing character by character
    const alexText = '  # Short-term'
    const sarahText = '    ema_12 = data.ewm(span=12).mean()'
    const mikeText = ' and ema_12 > sma_20'

    const editSequence: { delay: number, action: () => void }[] = []
    let currentDelay = 2000

    // Alex types comment character by character
    alexText.split('').forEach((_, i) => {
      editSequence.push({
        delay: currentDelay,
        action: () => {
          const typedText = alexText.slice(0, i + 1)
          setActiveCursors([{ line: 2, user: 'Alex', color: 'blue', text: typedText }])
          setCodeLines(prev => {
            const newLines = [...prev]
            newLines[2] = '    sma_20 = data.rolling(20).mean()' + typedText
            return newLines
          })
        }
      })
      currentDelay += 100
    })

    // Pause before Sarah starts
    currentDelay += 300

    // Sarah starts typing on line 4
    sarahText.split('').forEach((_, i) => {
      editSequence.push({
        delay: currentDelay,
        action: () => {
          const alexFinal = '  # Short-term'
          const typedText = sarahText.slice(0, i + 1)
          setActiveCursors([
            { line: 2, user: 'Alex', color: 'blue', text: alexFinal },
            { line: 4, user: 'Sarah', color: 'purple', text: typedText }
          ])
          setCodeLines(prev => {
            const newLines = [...prev]
            newLines[4] = typedText
            return newLines
          })
        }
      })
      currentDelay += 80
    })

    // Pause before Mike starts
    currentDelay += 400

    // Mike types on line 6
    mikeText.split('').forEach((_, i) => {
      editSequence.push({
        delay: currentDelay,
        action: () => {
          const sarahFinal = '    ema_12 = data.ewm(span=12).mean()'
          const typedText = mikeText.slice(0, i + 1)
          setActiveCursors([
            { line: 4, user: 'Sarah', color: 'purple', text: sarahFinal },
            { line: 6, user: 'Mike', color: 'emerald', text: typedText }
          ])
          setCodeLines(prev => {
            const newLines = [...prev]
            newLines[6] = '    signals = sma_20 > sma_50' + typedText
            return newLines
          })
        }
      })
      currentDelay += 90
    })

    // Clear cursors at the end
    editSequence.push({
      delay: currentDelay + 500,
      action: () => setActiveCursors([])
    })

    // Show notification after cursors clear
    editSequence.push({
      delay: currentDelay + 600,
      action: () => setShowNotification(true)
    })

    // Keep notification visible (don't hide it at the end)

    const timeouts: NodeJS.Timeout[] = []
    clickSequence.forEach(({ delay, action }) => {
      timeouts.push(setTimeout(action, delay))
    })
    editSequence.forEach(({ delay, action }) => {
      timeouts.push(setTimeout(action, delay))
    })

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [])

  return (
    <div className="absolute inset-0 flex flex-col p-4 pb-24">
      {!showCode ? (
        // File list view
        <div className="flex-1 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-white/40 font-mono">Workspace</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
          </div>

          {/* Active users list */}
          <div className="flex flex-col gap-2">
            <div className="text-xs text-white/40 mb-2">Team members online:</div>
            <AnimatePresence>
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                >
                  <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-white text-xs font-semibold`}>
                    {user.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/90">{user.name}</div>
                    <div className="text-[10px] text-white/40">Editing strategy.py</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Click cursor */}
          {clickCursor.show && (
            <motion.div
              className="absolute pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: clickCursor.x, y: clickCursor.y }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>
            </motion.div>
          )}
        </div>
      ) : (
        // Code editor view
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-white/40 font-mono">strategy.py</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
          </div>

          {/* Active users */}
          <div className="flex items-center gap-2 mb-4">
            <div className="text-xs text-white/40">Editing now:</div>
            <div className="flex -space-x-2">
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-6 h-6 rounded-full ${user.color} flex items-center justify-center text-white text-[10px] font-semibold border-2 border-gray-900`}
                >
                  {user.avatar}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Code editor */}
          <div className="h-64 bg-white/5 border border-white/10 rounded-lg p-3 font-mono text-xs overflow-hidden relative">
            {/* Activity Notification - Inside editor corner */}
            <AnimatePresence>
              {showNotification && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-2 right-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 shadow-lg z-20"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                      S
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium text-white whitespace-nowrap">Sarah running backtest</span>
                      <div className="flex items-center gap-1.5 text-[9px] text-white/60">
                        <motion.div
                          className="w-1 h-1 rounded-full bg-emerald-500"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span>ETA 1:30s</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {codeLines.map((line, index) => {
              const cursorOnLine = activeCursors.find(c => c.line === index)
              const user = users.find(u => u.name === cursorOnLine?.user)

              // Find the position of the highlighted text
              const highlightStart = cursorOnLine ? line.indexOf(cursorOnLine.text) : -1
              const beforeHighlight = highlightStart > 0 ? line.substring(0, highlightStart) : ''
              const highlightedText = cursorOnLine && highlightStart >= 0 ? cursorOnLine.text : ''
              const afterHighlight = cursorOnLine && highlightStart >= 0 ? line.substring(highlightStart + cursorOnLine.text.length) : line

              return (
                <div key={index} className="relative py-0.5 px-2 rounded">
                  <span className="text-white/30 mr-3 select-none">{index + 1}</span>
                  {cursorOnLine && highlightStart >= 0 ? (
                    <span className="text-white/80">
                      {beforeHighlight}
                      <span
                        className="relative"
                        style={{
                          backgroundColor: cursorOnLine.color === 'blue' ? 'rgba(59, 130, 246, 0.2)' :
                                          cursorOnLine.color === 'purple' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                        }}
                      >
                        {highlightedText}
                        {/* Blinking cursor line */}
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="inline-block w-0.5 h-3.5"
                          style={{
                            backgroundColor: cursorOnLine.color === 'blue' ? '#3b82f6' :
                                            cursorOnLine.color === 'purple' ? '#a855f7' : '#10b981'
                          }}
                        />
                        {/* User label pill */}
                        <div
                          className="absolute -top-7 left-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border z-10 whitespace-nowrap"
                          style={{
                            backgroundColor: cursorOnLine.color === 'blue' ? '#3b82f6' :
                                            cursorOnLine.color === 'purple' ? '#a855f7' : '#10b981',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          <div className={`w-4 h-4 rounded-full ${user?.color} flex items-center justify-center text-white text-[8px] font-semibold border border-white/30`}>
                            {user?.avatar}
                          </div>
                          <span className="text-[10px] text-white font-medium">{cursorOnLine.user}</span>
                        </div>
                      </span>
                      {afterHighlight}
                    </span>
                  ) : (
                    <span className="text-white/80">{line}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Status bar */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Synced</span>
              </div>
              <span>Python</span>
            </div>
            <span>Line 1, Col 1</span>
          </div>
        </>
      )}
    </div>
  )
}
