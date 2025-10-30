'use client'

import ProductLayout from "@/components/layout/ProductLayout"
import { GrTest } from "react-icons/gr"
import { motion } from "motion/react"

export default function ResearchPage() {
  return (
    <ProductLayout
      icon={<GrTest size={32} />}
      iconLabel="Research"
      title={<>Discover Alpha with <br/>Advanced Analytics</>}
      description={<>Leverage cutting-edge research tools and AI-powered <br/> insights to discover trading opportunities.<br/><br/> Analyze market patterns, test hypotheses, and develop <br/>strategies backed by data science.</>}
    >
      <div className="relative w-full h-[500px]">
        {/*Green chart*/}
        <div className="absolute top-0 right-0 w-[90%] z-10">
          <div className="bg-background border border-border rounded-lg overflow-hidden p-6">
            <svg className="w-full h-[200px]" viewBox="0 0 400 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/*Grid lines*/}
              {[0, 37.5, 75, 112.5, 150].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
              ))}

              {/*Line shading*/}
              <motion.path
                d="M0,112.5 L30,100 L60,120 L90,87.5 L120,95 L150,75 L180,80 L210,62.5 L240,70 L270,50 L300,45 L330,37.5 L360,30 L390,25 L390,150 L0,150 Z"
                fill="url(#greenGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />

              {/*Line*/}
              <motion.path
                d="M0,112.5 L30,100 L60,120 L90,87.5 L120,95 L150,75 L180,80 L210,62.5 L240,70 L270,50 L300,45 L330,37.5 L360,30 L390,25"
                stroke="rgb(16, 185, 129)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.8, duration: 2, ease: 'easeOut' }}
              />
            </svg>
            <div className="text-center mt-2 text-sm font-mono text-muted-foreground">
              Portfolio Returns
            </div>
          </div>
        </div>

        {/*Blue chart*/}
        <div className="absolute bottom-0 left-0 w-[85%] z-20">
          <div className="bg-background border border-border rounded-lg overflow-hidden p-6">
            <svg className="w-full h-[200px]" viewBox="0 0 400 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/*Grid lines*/}
              {[0, 37.5, 75, 112.5, 150].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
              ))}

              {/*Line shading*/}
              <motion.path
                d="M0,100 L30,95 L60,105 L90,90 L120,85 L150,95 L180,80 L210,75 L240,85 L270,70 L300,65 L330,70 L360,60 L390,55 L390,150 L0,150 Z"
                fill="url(#blueGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
              />

              {/* Line */}
              <motion.path
                d="M0,100 L30,95 L60,105 L90,90 L120,85 L150,95 L180,80 L210,75 L240,85 L270,70 L300,65 L330,70 L360,60 L390,55"
                stroke="rgb(59, 130, 246)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1.3, duration: 2, ease: 'easeOut' }}
              />
            </svg>
            <div className="text-center mt-2 text-sm font-mono text-muted-foreground">
              Sharpe Ratio
            </div>
          </div>
        </div>

        {/*Purple chart*/}
        <div className="absolute top-1/2 right-[-65%] -translate-y-1/2 w-[95%] z-30">
          <div className="bg-background border border-border rounded-lg overflow-hidden p-8">
            <svg className="w-full h-[280px]" viewBox="0 0 400 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/*Grid lines*/}
              {[0, 50, 100, 150, 200].map((y) => (
                <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
              ))}

              {/*Line shading*/}
              <motion.path
                d="M0,150 L30,140 L60,155 L90,125 L120,135 L150,110 L180,120 L210,95 L240,105 L270,85 L300,75 L330,60 L360,50 L390,40 L390,200 L0,200 Z"
                fill="url(#purpleGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8 }}
              />

              {/*Line*/}
              <motion.path
                d="M0,150 L30,140 L60,155 L90,125 L120,135 L150,110 L180,120 L210,95 L240,105 L270,85 L300,75 L330,60 L360,50 L390,40"
                stroke="rgb(168, 85, 247)"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1, duration: 2.5, ease: 'easeOut' }}
              />
            </svg>
            <div className="text-center mt-4 text-lg font-mono text-muted-foreground">
              Cumulative Alpha
            </div>
          </div>
        </div>
      </div>
    </ProductLayout>
  )
}
