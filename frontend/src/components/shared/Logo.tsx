import React from 'react'
import Link from 'next/link'

interface LogoProps {
  className?: string
  showText?: boolean
  href?: string
}

export default function Logo({ className, showText = true, href = '/' }: LogoProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 hover:opacity-80 transition-opacity -mt-0.5"
    >
      {/* 4-point star SVG */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Four-point star with rounded diamond shape */}
        <path
          d="M16 4C16 4 14 10 12 12C10 14 4 16 4 16C4 16 10 18 12 20C14 22 16 28 16 28C16 28 18 22 20 20C22 18 28 16 28 16C28 16 22 14 20 12C18 10 16 4 16 4Z"
          fill="url(#star-gradient)"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient
            id="star-gradient"
            x1="4"
            y1="4"
            x2="28"
            y2="28"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3b82f6" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>

      {showText && <span className="text-xl font-semibold">AlgoFlow</span>}
    </Link>
  )
}
