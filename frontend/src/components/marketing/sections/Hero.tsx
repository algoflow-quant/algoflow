'use client'

import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { TextAnimate } from "@/components/ui/text-animate"
import { Particles } from "@/components/ui/particles"
import { BorderBeam } from "@/components/ui/border-beam"
import { motion } from "motion/react"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Hero() {
  return (
    <div className="relative min-h-screen">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="absolute inset-0"
      >
        <Particles
          className="absolute inset-0"
          quantity={50}
          color="#3b82f6"
          size={1}
          staticity={50}
        />
      </motion.div>
      <div className="container mx-auto px-4 py-10 flex flex-col items-center justify-center gap-4 max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 2 }}
          className="bg-accent p-1 px-4 rounded-full border w-fit"
        >
          <AnimatedShinyText className="text-xs font-medium">
            ✨ AI-Powered Quantitative Trading →
          </AnimatedShinyText>
        </motion.div>
        <h1 className="text-[80px] text-center font-bold leading-[1.1] tracking-tight pb-2">
          <TextAnimate animation="blurInUp" by="word" delay={0} as="span" once>
            Stop trading your time.
          </TextAnimate>
          <span className="block pb-2">
            <TextAnimate animation="blurInUp" by="word" delay={1.1} as="span" className="text-primary" once>
              Start trading your edge.
            </TextAnimate>
          </span>
        </h1>
        <TextAnimate animation="fadeIn" delay={2} className="text-xl text-foreground/80 text-center max-w-3xl font-normal leading-relaxed" once>
          Harness an Institutional-grade quantitative development framework supercharged with AI. Build, backtest, and deploy algorithmic trading systems with the same technology powering billion-dollar hedge funds.
        </TextAnimate>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 2.8 }}
          className="mt-8"
        >
          <Link href="/signup">
            <button className="bg-white text-black px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-white/90 transition-colors">
              Start Building Strategies for Free
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </motion.div>

        {/* Screenshot Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.5 }}
          className="relative mt-16 w-[152%] -mx-[2.5%]"
        >
          {/* Ellipse gradient background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1600px] h-[800px] bg-blue-600 rounded-[50%] blur-[150px] opacity-50 -z-10" />

          {/* Screenshot container */}
          <div className="relative rounded-xl overflow-hidden border bg-background/50 backdrop-blur-sm mb-20">
            <BorderBeam size={250} duration={12} delay={9} colorFrom="#3b82f6" colorTo="#06b6d4" />
            <img
              src="/images/header/strategy-preview.png"
              alt="AlgoFlow Strategy Preview"
              className="w-full h-auto"
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
