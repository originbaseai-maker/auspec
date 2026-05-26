import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { ChevronLeft, X } from 'lucide-react'

export type SheetVariant = 'grid' | 'detail'

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
  /**
   * Drives the default height. 'grid' is taller (category picker fits
   * in one screen), 'detail' is shorter so the canvas stays visible
   * while the user drags sliders. Drag-to-resize on the grab handle
   * overrides this within a clamped range; the override resets when
   * `variant` or `open` changes.
   */
  variant?: SheetVariant
  /**
   * Escape hatch: explicit CSS height. When set, overrides `variant`.
   * Prefer `variant` for the standard grid/detail flows.
   */
  height?: string
}

/** Heights tuned per spec — detail must keep canvas above ~50% visible. */
function defaultHeightFor(variant: SheetVariant, smallPhone: boolean): string {
  if (variant === 'grid') {
    return smallPhone ? '50vh' : 'min(55vh, 480px)'
  }
  return smallPhone ? '40vh' : 'min(45vh, 420px)'
}

// Hard ceiling even when the user drags the handle up: keep the top
// quarter of the viewport free so the canvas preview is never fully
// obscured. Floor leaves room for header + grab handle.
const MIN_HEIGHT_VH = 0.2
const MAX_HEIGHT_VH = 0.75

/**
 * Mobile bottom sheet with backdrop, drag-to-resize grab handle, and
 * slide-up animation. Locks body scroll while open and closes on Escape.
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
  variant = 'detail',
  height,
}: Props) {
  // Small-phone (e.g. iPhone SE) breakpoint — kept reactive so a rotation
  // re-renders with the tighter default.
  const [smallPhone, setSmallPhone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerHeight < 700
  })
  useEffect(() => {
    const onResize = () => setSmallPhone(window.innerHeight < 700)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  // Manual drag-to-resize override. Reset whenever the variant changes
  // (grid ↔ detail) or the sheet closes so the next open lands on the
  // sensible default for that variant.
  const [manualHeightPx, setManualHeightPx] = useState<number | null>(null)
  useEffect(() => {
    setManualHeightPx(null)
  }, [variant, open])

  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ y: number; height: number } | null>(null)
  const [dragging, setDragging] = useState(false)

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

  const onHandlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const sheetEl = sheetRef.current
    if (!sheetEl) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* some browsers throw if the pointer is already released */
    }
    dragStartRef.current = {
      y: e.clientY,
      height: sheetEl.offsetHeight,
    }
    setDragging(true)
  }, [])

  const onHandlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragStartRef.current) return
      // Drag UP = pointer moves up = bigger sheet. clientY decreases.
      const dy = dragStartRef.current.y - e.clientY
      const vh = window.innerHeight
      const newHeight = dragStartRef.current.height + dy
      const clamped = Math.max(
        vh * MIN_HEIGHT_VH,
        Math.min(vh * MAX_HEIGHT_VH, newHeight),
      )
      setManualHeightPx(clamped)
    },
    [],
  )

  const onHandlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore — already released */
      }
      dragStartRef.current = null
      setDragging(false)
    },
    [],
  )

  if (!open) return null

  const resolvedHeight =
    manualHeightPx !== null
      ? `${manualHeightPx}px`
      : (height ?? defaultHeightFor(variant, smallPhone))

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'auspec-sheet-fade 200ms ease' }}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl border-t bg-[#0a0a0a]"
        style={{
          borderColor: '#2a2a2a',
          height: resolvedHeight,
          // Hard ceiling — even drag can't push past this so the canvas
          // is never fully covered.
          maxHeight: 'min(75vh, 600px)',
          // The slide-up animation runs once on mount; the height
          // transition runs every time `height` changes — but NOT during
          // an active drag (would lag behind the pointer).
          transition: dragging
            ? 'none'
            : 'height 250ms cubic-bezier(0.32, 0.72, 0, 1)',
          animation: 'auspec-sheet-slide 250ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="flex shrink-0 justify-center py-2 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          // Prevent the browser from interpreting the drag as a vertical
          // scroll — we own the gesture.
          style={{ touchAction: 'none' }}
          aria-label="Drag to resize sheet"
          role="separator"
        >
          <div
            className="h-1 w-10 rounded-full bg-white/30"
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
        {/* overscroll-contain prevents scroll-chaining: when the user
            scrolls past the end of the sheet body, the page underneath
            doesn't start scrolling. Tighter slider-row padding so more
            controls fit in the smaller height. */}
        <div className="auspec-mobile-sheet-body flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
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
        /* Tighter panel spacing on mobile — more sliders fit at once. */
        .auspec-mobile-sheet-body .space-y-5 > * + * {
          margin-top: 0.75rem;
        }
        .auspec-mobile-sheet-body section.space-y-2 > * + * {
          margin-top: 0.375rem;
        }
        .auspec-mobile-sheet-body input[type='range'].auspec-slider {
          height: 1.25rem;
        }
      `}</style>
    </>
  )
}

export default MobileBottomSheet
