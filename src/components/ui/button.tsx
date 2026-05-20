import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'ghost' | 'outline' | 'disabled'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANTS: Record<ButtonVariant, string> = {
  default:
    'bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] text-white hover:opacity-90 active:opacity-80',
  ghost: 'bg-transparent text-white hover:bg-white/5 active:bg-white/10',
  outline:
    'bg-transparent border border-[#2a2a2a] text-white hover:bg-white/5 active:bg-white/10',
  disabled: 'bg-[#1a1a1a] text-[#666666] cursor-not-allowed',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-9 px-4 text-sm rounded-md',
  lg: 'h-11 px-6 text-base rounded-lg',
  icon: 'h-9 w-9 rounded-md',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', disabled, ...props }, ref) => {
    const isDisabled = disabled || variant === 'disabled'
    const effectiveVariant = isDisabled ? 'disabled' : variant

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium',
          'transition-all duration-200 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000]',
          'disabled:pointer-events-none',
          VARIANTS[effectiveVariant],
          SIZES[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button }
export type { ButtonProps, ButtonVariant, ButtonSize }
