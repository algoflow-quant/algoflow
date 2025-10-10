"use client"
import React from 'react'
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"

export const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link href={href} className="relative px-4 py-2 text-center min-w-[100px]">
      {isActive && (
        <motion.div
          layoutId="navbar-pill"
          className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-full"
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30
          }}
        />
      )}
      <span className={
        isActive
          ? "relative z-10 text-foreground font-medium"
          : "relative z-10 text-muted-foreground hover:text-foreground transition-colors"
      }>
        {children}
      </span>
    </Link>
  )
}
export default NavLink