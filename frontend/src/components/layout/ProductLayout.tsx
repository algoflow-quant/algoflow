'use client'

import { TextAnimate } from "@/components/ui/text-animate"
import { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShineBorder } from "@/components/ui/shine-border"
import { Particles } from "@/components/ui/particles"
import { motion } from "motion/react"
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface Feature {
  icon: ReactNode
  title: string
  description: string
}

interface ProductLayoutProps {
  title: string | ReactNode
  description: string | ReactNode
  children?: ReactNode
  icon?: ReactNode
  iconLabel?: string
  features?: Feature[]
}

export default function ProductLayout({
  title,
  description,
  children,
  icon,
  iconLabel,
  features,
}: ProductLayoutProps) {
  return (
    <div className="relative w-full py-32 overflow-hidden">
      {/*Particle Site Background*/}
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
            {/*Small Icon with page name*/}
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

            {/*Buttons for signup and more info*/}
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
            {/*Background gradiant and glow behind visuals*/}
            <div className="absolute top-1/2 left-1/2 translate-x-[-40%] translate-y-[-40%] w-[800px] h-[600px] bg-blue-600 rounded-[50%] blur-[150px] opacity-50 -z-10" />

            {children || (
              <div className="w-full h-[400px] bg-gray-300 dark:bg-gray-700 rounded-lg" />
            )}
          </motion.div>
        </div>
      </div>

      {/*3 Card bottom feature section*/}
      {features && features.length > 0 && (
        <section className="pt-16 pb-0 md:pt-32 md:pb-0 relative z-10 w-full">
          {/* Gradient fade at top */}
          <div className="absolute left-0 right-0 bg-gradient-to-b from-transparent to-background" style={{ top: '64px', height: '64px' }} />
          {/* Solid background for feature section */}
          <div className="absolute left-0 right-0 bg-background" style={{ top: '128px', bottom: '-1000px' }} />
          <div className="@container mx-auto max-w-7xl px-6 relative z-10">
            <div className="@min-4xl:max-w-full @min-4xl:grid-cols-3 mx-auto mt-8 grid max-w-sm gap-12 *:text-center md:mt-16 md:gap-16">
              {features.map((feature, index) => (
                <Card key={index} className={`group border-0 shadow-none bg-transparent ${index === 0 ? '-ml-4' : ''} ${index === 2 ? '-mr-4' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardDecorator>
                      {feature.icon}
                    </CardDecorator>
                    <h3 className="mt-6 font-medium">{feature.title}</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div className="mask-radial-from-40% mask-radial-to-60% relative mx-auto size-36 duration-200">
    <div
      aria-hidden
      className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.15)_1px,transparent_1px)] bg-[size:24px_24px]"
    />
    <div className="bg-background absolute inset-0 m-auto flex size-12 items-center justify-center border-l border-t border-blue-500/30 text-blue-500">{children}</div>
  </div>
)
