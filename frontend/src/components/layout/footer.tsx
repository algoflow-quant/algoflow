'use client'

import React from 'react'
import Link from 'next/link'
import Logo from '@/components/shared/Logo'

const Footer = () => {
  return (
    <footer className="bg-background border-t py-12 mt-16">
      {/* Flex container to arrange items horizontally */}
      <div className="container mx-auto px-4  max-w-7xl flex flex-col justify-between">
        {/* Footer Logo*/}
        <div className="flex gap-2 flex-col md:items-start items-center md:justify-start">
          <Logo />
          <p className="text-sm text-muted-foreground ">Invest Smarter</p>
        </div>

        <div className="flex flex-row max-w-3xl ml-auto">
          {/* Footer Product Col */}
          <div className="flex-1 flex flex-col gap-3 md:pl-15 py-15 items-center md:items-end">
            <p className="font-bold text-foreground">Product</p>
            <Link href="/about#faq" className="text-sm text-muted-foreground hover:text-foreground">
              FAQ
            </Link>

            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
              About
            </Link>

            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </div>

          {/* Footer Contact Col */}
          <div className="flex-1 flex flex-col gap-3 md:pl-15 py-15 items-center md:items-end">
            <p className="font-bold text-foreground">Contact</p>
            <Link href="/email" className="text-sm text-muted-foreground hover:text-foreground">
              Email
            </Link>

            <Link href="/social" className="text-sm text-muted-foreground hover:text-foreground">
              Social
            </Link>

            <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground">
              Support
            </Link>
          </div>

          {/* Footer Legal Col*/}
          <div className="flex-1 flex flex-col gap-3 md:pl-15 py-15 items-center md:items-end">
            <p className="font-bold text-foreground">Legal</p>

            <Link href="/tos" className="text-sm text-muted-foreground hover:text-foreground">
              TOS
            </Link>

            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>

            <Link href="/copyright" className="text-sm text-muted-foreground hover:text-foreground">
              Copyright
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
