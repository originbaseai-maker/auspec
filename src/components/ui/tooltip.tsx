import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: TooltipSide
  delay?: number
  className?: string
}

const SIDE_CLASSES: Record<TooltipSide, string> = {
  top: '-translate-x-1/2 -translate-y-full left-1/2 -top-1.5',
  bottom: '-translate-x-1/2 translate-y-0 left-1/2 top-[calc(100%+6px)]',
  left: 'translate-x-[-100%] -translate-y-1/2 top-1/2 -left-1.5',
  right: 'translate-x-0 -translate-y-1/2 top-1/2 left-[calc(100%+6px)]',
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 200,
  className,
}: TooltipProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const show = useCallback(() => {
    clearTimer()
    timerRef.current = window.setTimeout(() => setOpen(true), delay)
  }, [clearTimer, delay])

  const hide = useCallback(() => {
    clearTimer()
    setOpen(false)
  }, [clearTimer])

  useEffect(() => clearTimer, [clearTimer])

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap',
            'rounded-md border border-[#2a2a2a] bg-[#0d0d0d] px-2 py-1',
            'text-xs text-white shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            SIDE_CLASSES[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

export type { TooltipProps, TooltipSide }
