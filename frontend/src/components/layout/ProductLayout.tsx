'use client'

import { TextAnimate } from "@/components/ui/text-animate"
import { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShineBorder } from "@/components/ui/shine-border"
import { Particles } from "@/components/ui/particles"
import { motion } from "motion/react"

interface ProductLayoutProps {
  title: string | ReactNode
  description: string | ReactNode
  children?: ReactNode
  icon?: ReactNode
  iconLabel?: string
}

export default function ProductLayout({
  title,
  description,
  children,
  icon,
  iconLabel,
}: ProductLayoutProps) {
  return (
    <div className="relative w-full py-32 overflow-hidden">
      {/*Particle Background*/}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0 }}
        className="absolute inset-0"
      >
        <Particles
          className="absolute inset-0"
          quantity={100}
          color="#3b82f6"
          size={1}
          staticity={50}
        />
      </motion.div>

      <div className="container mx-auto px-16 max-w-[1400px] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          {/*Left side - Header and description*/}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-6 -ml-8"
          >
            {/* Icon and Label */}
            {icon && iconLabel && (
              <div className="flex items-center gap-3 mb-2">
                <div className="text-primary">
                  {icon}
                </div>
                <span className="text-xl font-semibold text-foreground">{iconLabel}</span>
              </div>
            )}

            <h1 style={{ fontSize: '45px' }}
            className="font-bold tracking-tight text-left">
              {typeof title === 'string' ? (
                <TextAnimate animation="blurInUp" by="word" delay={0} as="span" once>
                  {title}
                </TextAnimate>
              ) : (
                title
              )}
            </h1>
            {typeof description === 'string' ? (
              <TextAnimate
                animation="fadeIn"
                delay={0.5}
                className="text-2xl text-muted-foreground text-left leading-relaxed font-medium"
                once
              >
                {description}
              </TextAnimate>
            ) : (
              <div className="text-2xl text-muted-foreground text-left leading-relaxed font-medium">
                {description}
              </div>
            )}

            {/*Buttons*/}
            <div className="mt-12 flex gap-4">
              <Link href="/signup" className="inline-block">
                <div className="relative rounded-md w-fit">
                  <ShineBorder shineColor="#ffffff" className="rounded-md z-20" />
                  <Button className="h-[44px] px-8 relative z-10 text-base tracking-wide bg-primary hover:bg-primary/90">
                    <span>Start Now!</span>
                  </Button>
                </div>
              </Link>

              <Link href="/about" className="inline-block">
                <div className="relative rounded-md w-fit">
                  <ShineBorder shineColor="#3b82f6" className="rounded-md z-20" />
                  <Button variant="outline" className="h-[44px] px-8 relative z-10 text-base tracking-wide">
                    <span>Learn More</span>
                  </Button>
                </div>
              </Link>
            </div>
          </motion.div>

          {/*Right side image/content*/}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative"
          >
            {/*Background gradiant and glow*/}
            <div className="absolute top-1/2 left-1/2 translate-x-[-40%] translate-y-[-40%] w-[800px] h-[600px] bg-blue-600 rounded-[50%] blur-[150px] opacity-50 -z-10" />

            {children || (
              <div className="w-full h-[400px] bg-gray-300 dark:bg-gray-700 rounded-lg" />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
