import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

// Reusable icon wrapper component
// Handles hover states and color transitions for all nav icons
interface NavIconProps {
  children: React.ReactNode
  size?: { width: string; height: string }
}

export function NavIcon({ children, size }: NavIconProps) {
  // Clone the child element and apply size as style if provided
  const childWithSize = size
    ? React.cloneElement(children as React.ReactElement<any>, { style: size })
    : children

  return (
    <div className="[&>svg]:fill-muted-foreground [&>svg]:stroke-muted-foreground group-hover:[&>svg]:fill-primary group-hover:[&>svg]:stroke-primary [&>svg]:transition-colors flex items-center justify-center">
      {childWithSize}
    </div>
  )
}

interface CustomNavbarDropdownButtonProps {
  href: string
  icon: React.ReactNode // React component
  title: string
  description: string
  iconBgClassName?: string
}

export function CustomNavbarDropdownButton({
  href,
  icon,
  title,
  description,
  iconBgClassName,
}: CustomNavbarDropdownButtonProps) {
  return (
    <Link href={href} className="flex flex-row gap-3 group p-2 rounded-sm transition-all group">
      {/* Icon container */}
      <div
        className={`w-10 h-10 shrink-0 rounded-md border flex items-center justify-center ${iconBgClassName || 'bg-muted'}`}
      >
        {icon}
      </div>

      {/* Text container - vertically centered */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <p className="text-foreground font-semibold text-sm">{title}</p>
          {/* Chevron - hidden by default, slides in on hover */}
          <ChevronRight
            style={{ width: '14px', height: '13px' }}
            className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          />
        </div>

        <p className="font-normal text-muted-foreground text-xs group-hover:text-primary transition-colors">
          {description}
        </p>
      </div>
    </Link>
  )
}

export function CustomNavbarDropdownButtonAlternative({
  href,
  icon,
  title,
  description,
  iconBgClassName,
}: CustomNavbarDropdownButtonProps) {
  return (
    <Link href={href} className="flex flex-row gap-3 group p-2 rounded-sm transition-all group">
      {/* Icon container */}
      <div
        className={`w-8 h-8 shrink-0 rounded-md border flex items-center justify-center ${iconBgClassName || 'bg-transparent'}`}
      >
        {icon}
      </div>

      {/* Text container - vertically centered, slightly raised */}
      <div className="flex-1 flex flex-col justify-center -mt-1">
        <div className="flex items-center gap-2">
          <p className="text-foreground font-semibold text-[13px]">{title}</p>
          {/* Chevron - hidden by default, slides in on hover */}
          <ChevronRight
            style={{ width: '13px', height: '12px' }}
            className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          />
        </div>

        <p className="font-normal text-muted-foreground text-xs group-hover:text-primary transition-colors">
          {description}
        </p>
      </div>
    </Link>
  )
}
