import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Cpu, Lock, Sparkles, Zap } from 'lucide-react'
import { AuroraText } from '@/components/ui/aurora-text'

export default function ContentSection() {
    return (
        <section className="py-16 md:py-20">
            <div className="mx-auto max-w-5xl px-4 [@media(min-width:1054px)]:px-0">
                <div className="grid gap-6 md:grid-cols-2 md:gap-12 text-center md:text-left">
                    <h2 className="text-4xl font-bold">
                        Institutional-Grade Quantitative Trading, <AuroraText>Democratized.</AuroraText>
                    </h2>
                    <div className="space-y-6">
                        <p>Our mission is to democratize quantitative trading by providing powerful, institutional-grade tools and data to traders of all levels. We believe that sophisticated trading strategies and backtesting capabilities should be accessible to everyone, not just hedge funds and financial institutions.</p>
                        <p>
                            By combining cutting-edge technology with an intuitive platform, we empower our users to develop, test, and deploy trading strategies with confidence—all without the need for expensive infrastructure or complex setups.
                        </p>
                        <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="gap-1 pr-1.5">
                            <Link href="#">
                                <span>Learn More</span>
                                <ChevronRight className="size-2" />
                            </Link>
                        </Button>
                    </div>
                </div>
                <div className="mt-12 w-full">
                    <Image
                        src="/images/about/ThuggerDevBoi.webp"
                        alt="About"
                        width={800}
                        height={600}
                        className="w-full h-auto max-h-[400px] object-cover object-top rounded-lg grayscale"
                    />
                </div>
                <div className="relative mx-auto max-w-5xl px-4 lg:px-0 mt-16">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Zap className="size-4" />
                                <h3 className="text-sm font-medium">Innovation</h3>
                            </div>
                            <p className="text-muted-foreground text-sm">Constantly pushing boundaries to bring cutting-edge solutions to quantitative trading.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Cpu className="size-4" />
                                <h3 className="text-sm font-medium">Accessibility</h3>
                            </div>
                            <p className="text-muted-foreground text-sm">Making professional-grade tools available to traders at every level.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Lock className="size-4" />
                                <h3 className="text-sm font-medium">Security</h3>
                            </div>
                            <p className="text-muted-foreground text-sm">Protecting your data and strategies with institutional-grade security measures.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Sparkles className="size-4" />
                                <h3 className="text-sm font-medium">Transparency</h3>
                            </div>
                            <p className="text-muted-foreground text-sm">Building trust through clear communication and honest practices.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
