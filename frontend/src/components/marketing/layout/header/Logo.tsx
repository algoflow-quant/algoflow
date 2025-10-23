import React from 'react'
import Link from 'next/link'

export default function Logo() {
  return (
    <Link href="/" className="text-xl font-medium hover:opacity-80 transition-opacity">
      Algoflow
    </Link>
  )
}
