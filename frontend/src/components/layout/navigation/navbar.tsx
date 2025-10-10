"use client"

import React from 'react'
import { motion } from 'framer-motion'
import NavLink from '@/components/layout/navigation/navlink'
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import AuthButton from '@/components/layout/navigation/auth-button'

const NavBar = () => {
  return (
    <motion.nav
      className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 1,
        delay: 0.4,
        ease: [0.6, 0.01, 0.05, 0.95]
      }}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Left: Logo */}
        <div className="flex items-center min-w-[120px]">
          <a href="/" className="font-bold text-xl">AlgoFlow</a>
        </div>

        {/* Center: Nav Links - Absolutely centered */}
        <div className="hidden md:flex gap-4 absolute left-1/2 -translate-x-1/2">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
          <NavLink href="/about">About</NavLink>
          <NavLink href="/lab">Lab</NavLink>
        </div>

        {/* Right: Theme + Auth */}
        <div className="flex items-center gap-12 min-w-[120px] justify-end">
          <AnimatedThemeToggler />
          <AuthButton />
        </div>
      </div>
    </motion.nav>
  )
}

export default NavBar