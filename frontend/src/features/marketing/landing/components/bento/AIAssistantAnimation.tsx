'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface Message {
  id: number
  type: 'user' | 'assistant' | 'chart'
  text?: string
}

export default function AIAssistantAnimation() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isHovered, setIsHovered] = useState(false)
  const [isBacktesting, setIsBacktesting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [subAgentStatus, setSubAgentStatus] = useState<string>('')
  const [showWelcome, setShowWelcome] = useState(true)
  const [userTyping, setUserTyping] = useState('')

  useEffect(() => {
    if (!isHovered) {
      setMessages([])
      setIsBacktesting(false)
      setIsTyping(false)
      setSubAgentStatus('')
      setShowWelcome(true)
      setUserTyping('')
      return
    }

    // Start typing animation
    const fullText = 'Integrate Hidden Markov Chain into my ML strategy'
    let currentIndex = 0

    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setUserTyping(fullText.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typingInterval)
        setShowWelcome(false)
      }
    }, 30)

    const sequence = [
      { delay: fullText.length * 30 + 200, action: () => setMessages([{ id: 1, type: 'user', text: 'Integrate Hidden Markov Chain into my ML strategy' }]) },
      { delay: 1500, action: () => setIsTyping(true) },
      { delay: 2500, action: () => {
        setIsTyping(false)
        setMessages(prev => [...prev, { id: 2, type: 'assistant', text: 'I\'ll help you integrate HMM into your strategy. Let me update the code...' }])
      }},
      { delay: 3500, action: () => setIsTyping(true) },
      { delay: 4500, action: () => {
        setIsTyping(false)
        setMessages(prev => [...prev, { id: 3, type: 'assistant', text: 'Code updated. Starting backtest...' }])
      }},
      { delay: 5000, action: () => {
        setIsBacktesting(true)
        setSubAgentStatus('Calling data validation agent...')
      }},
      { delay: 6500, action: () => setSubAgentStatus('Calling optimization agent...') },
      { delay: 8000, action: () => setSubAgentStatus('Calling risk analysis agent...') },
      { delay: 9500, action: () => {
        setIsBacktesting(false)
        setSubAgentStatus('')
      }},
      { delay: 10000, action: () => setIsTyping(true) },
      { delay: 11000, action: () => {
        setIsTyping(false)
        setMessages(prev => [...prev, { id: 4, type: 'chart' }])
      }},
    ]

    const timeouts: NodeJS.Timeout[] = []
    sequence.forEach(({ delay, action }) => {
      timeouts.push(setTimeout(action, delay))
    })

    return () => {
      clearInterval(typingInterval)
      timeouts.forEach(clearTimeout)
    }
  }, [isHovered])

  return (
    <div
      className="absolute inset-0 flex flex-col p-4 pb-30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>
        <div className="text-xs text-white/40 font-mono">AI Agent</div>
      </div>

      {/* Welcome screen or chat messages */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden justify-center">
        {showWelcome ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4">
            <div className="text-lg font-medium text-white/90">Good morning</div>
            <div className="w-full max-w-xs">
              <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <div className="text-xs text-white/40">
                  {userTyping || 'How can I help you today?'}
                  {userTyping && <span className="animate-pulse">|</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/50">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Code
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/50">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Learn
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/50">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                </svg>
                Agent
              </div>
            </div>
            <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] text-purple-300">
              Opus 4.1
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {messages.map((message) => {
              const hasChart = messages.some(m => m.type === 'chart')

              return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: hasChart ? -60 : 0
              }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                duration: 0.3,
                y: { duration: 0.5, ease: 'easeInOut' }
              }}
              className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {(message.type === 'assistant' || message.type === 'chart') && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                </div>
              )}
              {message.type === 'chart' ? (
                <div className="max-w-[85%] bg-white/5 border border-white/10 rounded-lg p-2">
                  {/* Chart header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-semibold text-white/90">Backtest Results</div>
                    <div className="text-xs font-mono text-emerald-400">+23% Sharpe</div>
                  </div>

                  {/* Mini line chart */}
                  <div className="h-10 w-full relative">
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                      <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                      <line x1="0" y1="30" x2="100" y2="30" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

                      {/* Upward trending line with some volatility */}
                      <motion.path
                        d="M 0 35 L 10 32 L 20 28 L 30 30 L 40 25 L 50 22 L 60 20 L 70 18 L 80 15 L 90 12 L 100 10"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />

                      {/* Gradient fill under line */}
                      <motion.path
                        d="M 0 35 L 10 32 L 20 28 L 30 30 L 40 25 L 50 22 L 60 20 L 70 18 L 80 15 L 90 12 L 100 10 L 100 40 L 0 40 Z"
                        fill="url(#areaGradient)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />

                      {/* Gradient definitions */}
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-white/5">
                    <div className="flex-1">
                      <div className="text-[9px] text-white/40">Return</div>
                      <div className="text-[11px] font-semibold text-emerald-400">+47.2%</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-white/40">Win Rate</div>
                      <div className="text-[11px] font-semibold text-white/80">68%</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-white/40">Max DD</div>
                      <div className="text-[11px] font-semibold text-red-400">-12.3%</div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[9px] text-white/60">
                    💡 Consider adding position sizing rules
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-lg text-xs ${
                    message.type === 'user'
                      ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                      : 'bg-white/5 text-white/90 border border-white/10'
                  }`}
                >
                  {message.text}
                </div>
              )}
              {message.type === 'user' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </motion.div>
          )
            })}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        {!showWelcome && isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex gap-2 justify-start"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
              </svg>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-1">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-white/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-white/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-white/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          </motion.div>
        )}

        {/* Backtest running indicator with sub-agent status */}
        {!showWelcome && isBacktesting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <motion.div
                className="w-2 h-2 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-xs text-emerald-400 font-mono">Running backtest...</span>
            </div>
            {subAgentStatus && (
              <motion.div
                key={subAgentStatus}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg ml-4"
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-purple-400"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <span className="text-xs text-purple-300 font-mono">{subAgentStatus}</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
