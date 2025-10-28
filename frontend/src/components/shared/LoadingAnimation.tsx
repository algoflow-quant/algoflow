'use client'

interface LoadingAnimationProps {
  size?: number
  className?: string
  color?: string
}

export default function LoadingAnimation({
  size = 32,
  className,
  color = 'white',
}: LoadingAnimationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block' }}
    >
      {/* Four-point star outline with snake trace animation */}
      <path
        d="M16 4C16 4 14 10 12 12C10 14 4 16 4 16C4 16 10 18 12 20C14 22 16 28 16 28C16 28 18 22 20 20C22 18 28 16 28 16C28 16 22 14 20 12C18 10 16 4 16 4Z"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pathLength="1"
        strokeDasharray="0.2 0.8"
        className="animate-trace"
      />

      <style>{`
        @keyframes trace {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -1;
          }
        }

        .animate-trace {
          animation: trace 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
      `}</style>
    </svg>
  )
}
