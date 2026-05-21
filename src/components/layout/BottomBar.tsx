import type { JSX } from 'react'
import { cn } from '@/lib/utils'

interface BottomBarProps {
  height?: number
  children: React.ReactNode
  className?: string
}

export default function BottomBar({
  height = 72,
  children,
  className,
}: BottomBarProps): JSX.Element {
  return (
    <div
      className={cn(
        'shrink-0 w-full border-t border-[#2a2a2a] bg-[#0d0d0d]',
        'flex items-center',
        className,
      )}
      style={{ height: `${height}px` }}
    >
      {children}
    </div>
  )
}
