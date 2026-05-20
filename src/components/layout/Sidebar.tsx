import type { JSX } from 'react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  side: 'left' | 'right'
  width?: number
  children: React.ReactNode
  className?: string
}

export default function Sidebar({
  side,
  width = 240,
  children,
  className,
}: SidebarProps): JSX.Element {
  const borderClass = side === 'left' ? 'border-r' : 'border-l'

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 h-full',
        'bg-[#0d0d0d] border-[#2a2a2a]',
        borderClass,
        className,
      )}
      style={{ width: `${width}px` }}
      data-side={side}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </aside>
  )
}
