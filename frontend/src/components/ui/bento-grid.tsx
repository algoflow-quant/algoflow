import { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ArrowRightIcon } from '@radix-ui/react-icons'
import Link from 'next/link'

import { cn } from '@/lib/utils'

interface BentoGridProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<'a'> {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div className={cn('grid w-full auto-rows-[28rem] grid-cols-3 gap-4', className)} {...props}>
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <Link
    href={href}
    key={name}
    className={cn(
      'group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl cursor-pointer',
      // light styles
      'bg-muted/50 border',
      // dark styles
      'dark:bg-muted/30 transform-gpu dark:border',
      className
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="p-6">
      <div className="pointer-events-none z-10 flex transform-gpu gap-3 items-start transition-all duration-500 ease-in-out lg:group-hover:translate-y-[calc(100%-3rem)]">
        <Icon className="h-6 w-6 flex-shrink-0 text-neutral-700 dark:text-neutral-300 transition-all duration-500 ease-in-out lg:group-hover:h-5 lg:group-hover:w-5" />
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 transition-all duration-500 ease-in-out lg:group-hover:text-base">
            {name}
          </h3>
          <p className="max-w-lg text-sm text-neutral-400 opacity-100 transition-all duration-500 ease-in-out lg:group-hover:opacity-0 lg:group-hover:translate-y-8">
            {description}
          </p>
        </div>
      </div>

      <div
        className={cn(
          'pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden'
        )}
      >
        <span className="text-sm font-medium text-primary">
          {cta}
          <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180 inline-block" />
        </span>
      </div>
    </div>

    <div
      className={cn(
        'pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center gap-3 p-4 opacity-0 transition-all duration-500 delay-200 ease-in-out group-hover:translate-y-0 group-hover:opacity-100 lg:flex'
      )}
    >
      <span className="text-sm font-medium text-primary">
        {cta}
        <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180 inline-block" />
      </span>
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
  </Link>
)

export { BentoCard, BentoGrid }
