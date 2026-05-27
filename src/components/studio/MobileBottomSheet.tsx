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
  /**
   * Reports the sheet's current rendered height in CSS px to the
   * parent. Fires on open, on default-height changes (variant /
   * small-phone resize), and continuously during drag-resize. Reports
   * 0 when closed. Parent uses this to shrink a layout spacer so the
   * canvas above physically resizes to stay fully visible.
   */
  onHeightChange?: (px: number) => void
  /**
   * How many CSS px to push the sheet up from the viewport bottom.
   * Used to clear the pinned bottom-tabs strip — the sheet sits
   * directly above the tabs instead of overlapping them.
   */
  bottomOffsetPx?: number
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
  onHeightChange,
  bottomOffsetPx = 0,
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

  // Report height upward via ResizeObserver so a parent spacer can
  // shrink the canvas area to match. Fires on open (slide-up animation
  // updates offsetHeight every frame), on default-height changes, and
  // continuously during drag-resize. When the sheet closes we report
  // 0 explicitly because the JSX returns null before the observer
  // could see the unmount.
  useEffect(() => {
    if (!open) {
      onHeightChange?.(0)
      return
    }
    const el = sheetRef.current
    if (!el || !onHeightChange) return
    // Initial fire so the parent has a value before the first
    // ResizeObserver tick (otherwise the spacer flashes from 0 to N).
    onHeightChange(el.offsetHeight)
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) onHeightChange(Math.round(entry.contentRect.height))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, onHeightChange])

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
      {/* Transparent click-catcher — closes the sheet on tap outside.
          We don't dim the canvas because the canvas is physically
          shrunk above the sheet (parent spacer handles that), so it's
          already fully visible and shouldn't be obscured. */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{
          background: 'rgba(0, 0, 0, 0.001)',
          animation: 'auspec-sheet-fade 200ms ease',
        }}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed left-0 right-0 z-50 flex flex-col rounded-t-2xl"
        style={{
          bottom: bottomOffsetPx,
          height: resolvedHeight,
          // Hard ceiling — even drag can't push past this so a sliver
          // of the canvas above remains visible.
          maxHeight: 'min(75vh, 600px)',
          background: '#0a0a0a',
          borderTop: '1px solid #1f1f1f',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.5)',
          // Slide-up runs once on mount; height transition runs on
          // variant/default changes but NOT during drag (would lag the
          // pointer).
          transition: dragging
            ? 'none'
            : 'height 240ms cubic-bezier(0.4, 0, 0.2, 1)',
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
            className="mx-auto h-1 w-12 rounded-full"
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              boxShadow: '0 0 12px rgba(255, 255, 255, 0.2)',
            }}
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
