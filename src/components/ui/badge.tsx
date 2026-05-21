import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'outline' | 'accent' | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-[#1a1a1a] text-white border border-[#2a2a2a]',
  outline: 'bg-transparent text-white border border-[#2a2a2a]',
  accent:
    'bg-gradient-to-r from-[#3b82f6]/15 to-[#8b5cf6]/15 text-white border border-[#3b82f6]/30',
  muted: 'bg-[#1a1a1a] text-[#666666] border border-[#2a2a2a]',
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5',
        'text-xs font-medium tracking-tight',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  ),
)
Badge.displayName = 'Badge'

export { Badge }
export type { BadgeProps, BadgeVariant }
