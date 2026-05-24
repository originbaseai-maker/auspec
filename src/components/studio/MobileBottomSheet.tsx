import { useEffect, type ReactNode } from 'react'
import { ChevronLeft, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  /**
   * When provided, a ChevronLeft button appears to the left of the
   * title. Use this to model an in-sheet "back" action without closing
   * the whole sheet (e.g. detail view → grid view).
   */
  onBack?: () => void
  title: string
  children: ReactNode
  /** Accepts a percentage string or any valid CSS height. Animates smoothly between values. */
  height?: string
}

/**
 * Mobile bottom sheet with a backdrop, drag-handle visual, and slide-up
 * animation. Locks body scroll while open and closes on Escape.
 *
 * Renders nothing when `open === false`, so it's safe to mount as a
 * sibling and toggle via parent state.
 */
export function MobileBottomSheet({
  open,
  onClose,
  onBack,
  title,
  children,
  height = '70%',
}: Props) {
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'auspec-sheet-fade 200ms ease' }}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl border-t bg-[#0a0a0a]"
        style={{
          borderColor: '#2a2a2a',
          height,
          // The slide-up animation runs once on mount; the height
          // transition runs every time `height` changes (e.g. when the
          // Tools sheet shrinks for a detail view).
          transition: 'height 250ms cubic-bezier(0.32, 0.72, 0, 1)',
          animation: 'auspec-sheet-slide 250ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="flex shrink-0 justify-center py-2">
          <div
            className="h-1 w-10 rounded-full bg-white/20"
            aria-hidden="true"
          />
        </div>
        <div
          className="flex shrink-0 items-center justify-between border-b px-4 py-2"
          style={{ borderColor: '#1a1a1a' }}
        >
          <div className="flex items-center gap-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
      <style>{`
        @keyframes auspec-sheet-slide {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes auspec-sheet-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}

export default MobileBottomSheet
