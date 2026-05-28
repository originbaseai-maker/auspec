import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
} from 'react'
import { useLayerStore } from '@/store/useLayerStore'
import { useCoverArtStore } from '@/store/useCoverArtStore'
import { useStudioUIStore } from '@/store/useStudioUIStore'
import type { StudioCategory } from '@/types/studio'
import type { HaloLayerConfig, Layer, ShapeLayerConfig } from '@/types/layer'
import {
  getLayerBounds,
  getLayerSizeRange,
  setLayerBoundsPatch,
} from '@/lib/layerTransform'

type SelectableTarget =
  | { kind: 'layer'; layerId: string }
  | { kind: 'logo' }

interface PointDragState {
  layerId: string
  index: number
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  wrapperWidth: number
  wrapperHeight: number
  /** Whether the pointer has actually moved past the click-threshold yet. */
  moved: boolean
}

const POINT_CLICK_THRESHOLD_PX = 4

/**
 * Per-axis fractional distance from canvas centre below which the
 * snap engages. 1.5% of canvas — small enough that the user has to
 * actually be aiming at centre, large enough that you don't have to
 * pixel-hunt.
 */
const SNAP_ENGAGE_THRESHOLD = 0.015

/**
 * Once engaged, the cursor's would-be position must move further
 * than this from centre before the snap releases. The asymmetry
 * (engage 0.015 < release 0.03) is what makes the snap feel
 * "sticky" — you don't accidentally drift off centre when nudging
 * the other axis. Tuned higher than the engage by 2x so you have
 * to deliberately drag past it.
 */
const SNAP_BREAKAWAY_THRESHOLD = 0.03

/**
 * Tracks the persistent snap state across pointermove events within
 * a single drag. Lives in a ref so updating it doesn't trigger a
 * React re-render on every pointer event — only the actively-
 * displayed `snapVisible` state (mirrored from this ref) drives
 * re-renders, and only on transitions.
 */
interface SnapState {
  snappedX: boolean
  snappedY: boolean
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Selectable {
  target: SelectableTarget
  /** 0–1 horizontal center. */
  x: number
  /** 0–1 vertical center. */
  y: number
  /** Hit-box radius in CSS pixels of the wrapper. */
  sizePx: number
  locked: boolean
}

interface DragState {
  target: SelectableTarget
  mode: 'move' | 'resize'
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  startSizePx: number
  wrapperWidth: number
  wrapperHeight: number
}

function sameTarget(a: SelectableTarget | null, b: SelectableTarget | null): boolean {
  if (!a || !b) return false
  if (a.kind === 'logo' && b.kind === 'logo') return true
  if (a.kind === 'layer' && b.kind === 'layer') return a.layerId === b.layerId
  return false
}

/**
 * Interactive overlay above the canvas. Lets the user click + drag a
 * visualizer (circular/polygon) or the logo to move/resize directly.
 *
 *   - Click target → select (blue ring + handles appear)
 *   - Drag body → move (updates offsetX/Y or coverArtPosition)
 *   - Drag corner handle → resize (updates radius or logoSize)
 *   - Locked layers can't be interacted with
 *   - Click empty area or press Escape → deselect
 *
 * The wrapper itself is `pointer-events: none` so clicks fall through
 * to whatever is below (e.g. TextInteractive) when not targeting a hit
 * area. A full-area deselect catcher activates only while selected.
 */
export function CanvasInteractiveOverlay(): JSX.Element | null {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const layers = useLayerStore((s) => s.layers)
  const draftLayer = useLayerStore((s) => s.draftLayer)
  const activeLayerId = useLayerStore((s) => s.activeLayerId)
  const updateConfig = useLayerStore((s) => s.updateConfig)
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer)
  const penToolActive = useLayerStore((s) => s.penToolActive)
  const addShapePoint = useLayerStore((s) => s.addShapePoint)
  const updateShapePoint = useLayerStore((s) => s.updateShapePoint)
  const removeShapePoint = useLayerStore((s) => s.removeShapePoint)

  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)

  // Resolve the active shape layer (draft OR committed) — Pen Mode is
  // active only when both penToolActive is true and the active layer is
  // a shape.
  const activeLayer = activeLayerId
    ? draftLayer && draftLayer.id === activeLayerId
      ? draftLayer
      : layers.find((l) => l.id === activeLayerId)
    : undefined
  const activeShape =
    activeLayer && activeLayer.type === 'shape' ? activeLayer : null
  const penMode = penToolActive && activeShape !== null
  const shapeCfg = penMode && activeShape
    ? (activeShape.config as ShapeLayerConfig)
    : null

  // Cover art store doubles as the logo store — coverArtPosition is
  // shared between cover art + logo, logoSize controls logo render scale.
  const logo = useCoverArtStore((s) => s.logo)
  const coverArtPosition = useCoverArtStore((s) => s.coverArtPosition)
  const logoSize = useCoverArtStore((s) => s.logoSize)
  const setCoverArtPosition = useCoverArtStore((s) => s.setCoverArtPosition)
  const setLogoSize = useCoverArtStore((s) => s.setLogoSize)

  const [selected, setSelected] = useState<SelectableTarget | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [pointDrag, setPointDrag] = useState<PointDragState | null>(null)
  const [wrapperSize, setWrapperSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  })
  // Persistent snap state across pointermove events — held in a ref
  // so per-frame snap math doesn't trigger React updates. The
  // derived `snapVisible` mirrors it for the guide-line render path,
  // but only updates on transitions (engage / break).
  const snapRef = useRef<SnapState>({ snappedX: false, snappedY: false })
  const [snapVisible, setSnapVisible] = useState<SnapState>({
    snappedX: false,
    snappedY: false,
  })

  // Track wrapper size so hit boxes recompute when the canvas resizes
  // (format switch, window resize, mobile orientation).
  useEffect(() => {
    if (!wrapperRef.current) return
    const update = () => {
      const r = wrapperRef.current?.getBoundingClientRect()
      if (r) setWrapperSize({ w: r.width, h: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // Auto-sync selection with the active layer when it has bounds.
  // Routes through getLayerBounds so adding a new positionable layer
  // kind (Halo, etc.) requires no edit here — the contract decides.
  useEffect(() => {
    if (!activeLayerId) return
    const layer = layers.find((l) => l.id === activeLayerId)
    if (!layer) return
    if (getLayerBounds(layer, 1) === null) return // 1 is a dummy minDim — we only need null vs non-null
    setSelected({ kind: 'layer', layerId: layer.id })
  }, [activeLayerId, layers])

  // Escape deselects.
  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const wrapperW = wrapperSize.w
  const wrapperH = wrapperSize.h
  const minDim = Math.min(wrapperW, wrapperH)

  // Universal selectables: any enabled layer whose bounds contract
  // returns non-null becomes draggable. Lock state propagates from
  // layer.locked. Halo with lockToLogo is filtered specially below —
  // dragging it routes to the topmost Logo layer (matching the panel
  // hint "Dragging the Logo drags the Halo") instead of being a
  // no-op.
  const selectables: Selectable[] = []
  for (const layer of layers) {
    if (!layer.enabled) continue
    const bounds = getLayerBounds(layer, minDim)
    if (!bounds) continue
    selectables.push({
      target: { kind: 'layer', layerId: layer.id },
      x: bounds.x,
      y: bounds.y,
      sizePx: bounds.sizePx,
      locked: layer.locked,
    })
  }
  // Legacy cover-art logo (when no LogoLayer exists). The new path
  // surfaces logos as LogoLayer instances handled by the universal
  // loop above; this is only a fallback for users who uploaded a
  // logo via CoverArtUploader without adding a Logo layer.
  const hasLogoLayer = layers.some((l) => l.type === 'logo' && l.enabled)
  if (logo && minDim > 0 && !hasLogoLayer) {
    selectables.push({
      target: { kind: 'logo' },
      x: coverArtPosition.x,
      y: coverArtPosition.y,
      sizePx: Math.max(20, (minDim * logoSize) / 2),
      locked: false,
    })
  }

  /**
   * Resolve a halo-with-lockToLogo selectable to the Logo it should
   * actually drag. Returns the Logo layer, or null if there is no
   * Logo in the stack (in which case the halo falls back to its own
   * offsetX/Y and drag is allowed directly).
   */
  const resolveHaloProxy = (selLayerId: string): Layer | null => {
    const halo = layers.find((l) => l.id === selLayerId)
    if (!halo || halo.type !== 'halo') return null
    const cfg = halo.config as HaloLayerConfig
    if (!cfg.lockToLogo) return null
    const logoLayer = layers.find((l) => l.type === 'logo' && l.enabled)
    return logoLayer ?? null
  }

  // Category mapping for the right-rail panel to open when a layer
  // is selected. Adding a layer kind here lights up the panel auto-
  // open behaviour — does NOT affect dragability (the bounds
  // contract decides that).
  const LAYER_TYPE_TO_CATEGORY: Record<string, StudioCategory> = {
    circular: 'visualizer_circular',
    polygon: 'visualizer_polygon',
    bloom: 'visualizer_bloom',
    halo: 'visualizer_halo',
    logo: 'logo',
    shape: 'visualizer_shape',
    video: 'visualizer_video',
    // bars/wave/particles/frame/text not auto-opened via canvas drag.
  }

  const startMove = (e: React.PointerEvent, sel: Selectable) => {
    if (sel.locked) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    e.preventDefault()
    e.stopPropagation()

    // For a Halo with lockToLogo + an existing Logo, redirect the
    // drag onto the Logo layer — moving the Halo directly would be
    // overridden next frame by the lock anyway. The selection still
    // shows the Halo (that's what the user clicked) but the bounds
    // we write go to the Logo.
    let dragTarget = sel.target
    let dragStartX = sel.x
    let dragStartY = sel.y
    if (sel.target.kind === 'layer') {
      const proxy = resolveHaloProxy(sel.target.layerId)
      if (proxy) {
        dragTarget = { kind: 'layer', layerId: proxy.id }
        const proxyBounds = getLayerBounds(proxy, minDim)
        if (proxyBounds) {
          dragStartX = proxyBounds.x
          dragStartY = proxyBounds.y
        }
      }
    }
    setSelected(sel.target)
    if (sel.target.kind === 'layer') {
      const tgt = sel.target
      setActiveLayer(tgt.layerId)
      const l = layers.find((x) => x.id === tgt.layerId)
      const cat = l ? LAYER_TYPE_TO_CATEGORY[l.type] : undefined
      if (cat) setActiveCategory(cat)
    } else {
      setActiveCategory('logo')
    }
    setDragState({
      target: dragTarget,
      mode: 'move',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: dragStartX,
      startY: dragStartY,
      startSizePx: sel.sizePx,
      wrapperWidth: rect.width,
      wrapperHeight: rect.height,
    })
  }

  const startResize = (e: React.PointerEvent, sel: Selectable) => {
    if (sel.locked) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    e.preventDefault()
    e.stopPropagation()
    // Seed the snap state from the layer's current centre at the
    // start of resize. Resize doesn't change x/y, so the snap state
    // stays valid throughout — the guides keep showing "you're
    // still centred" feedback while the user adjusts size. Without
    // this, snap state would stay at its previous (post-drag-end)
    // value of false/false and guides wouldn't appear even on a
    // perfectly centred layer.
    const startSnap: SnapState = {
      snappedX: Math.abs(sel.x - 0.5) <= SNAP_ENGAGE_THRESHOLD,
      snappedY: Math.abs(sel.y - 0.5) <= SNAP_ENGAGE_THRESHOLD,
    }
    snapRef.current = startSnap
    setSnapVisible(startSnap)
    setDragState({
      target: sel.target,
      mode: 'resize',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: sel.x,
      startY: sel.y,
      startSizePx: sel.sizePx,
      wrapperWidth: rect.width,
      wrapperHeight: rect.height,
    })
  }

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState) return
      const tgt = dragState.target
      const wrapMinDim = Math.min(
        dragState.wrapperWidth,
        dragState.wrapperHeight,
      )

      if (dragState.mode === 'move') {
        const dx = (e.clientX - dragState.startMouseX) / dragState.wrapperWidth
        const dy = (e.clientY - dragState.startMouseY) / dragState.wrapperHeight
        // Desired (no-snap) position the user is currently dragging
        // toward. Snap decisions compare THIS to centre, not the
        // post-snap value — otherwise once snapped, the desired
        // value would equal 0.5 forever and we could never break.
        const desiredX = Math.max(0, Math.min(1, dragState.startX + dx))
        const desiredY = Math.max(0, Math.min(1, dragState.startY + dy))

        // Per-axis snap with sticky break-away. Engage threshold is
        // smaller than the breakaway so a tiny over-move past
        // centre doesn't immediately disengage — it's the asymmetry
        // that makes the snap feel held-in-place.
        const snap = snapRef.current
        const wasSnappedX = snap.snappedX
        const wasSnappedY = snap.snappedY
        let snappedX: boolean
        if (wasSnappedX) {
          snappedX = Math.abs(desiredX - 0.5) <= SNAP_BREAKAWAY_THRESHOLD
        } else {
          snappedX = Math.abs(desiredX - 0.5) <= SNAP_ENGAGE_THRESHOLD
        }
        let snappedY: boolean
        if (wasSnappedY) {
          snappedY = Math.abs(desiredY - 0.5) <= SNAP_BREAKAWAY_THRESHOLD
        } else {
          snappedY = Math.abs(desiredY - 0.5) <= SNAP_ENGAGE_THRESHOLD
        }

        const newX = snappedX ? 0.5 : desiredX
        const newY = snappedY ? 0.5 : desiredY

        // Update snap state on transitions only — saves React work
        // (the pointermove fires ~60x/sec; transitions happen at
        // most a few times per drag).
        if (snappedX !== wasSnappedX || snappedY !== wasSnappedY) {
          snap.snappedX = snappedX
          snap.snappedY = snappedY
          setSnapVisible({ snappedX, snappedY })
          // Haptic feedback on snap ENGAGE only (not on release).
          // Pulses for ~5 ms on devices that support it; silently
          // no-ops on desktop / browsers that don't.
          const engaged =
            (!wasSnappedX && snappedX) || (!wasSnappedY && snappedY)
          if (engaged && typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate(5)
            } catch {
              /* some browsers throw without permission — silent */
            }
          }
        }

        if (tgt.kind === 'layer') {
          const layer = useLayerStore
            .getState()
            .layers.find((l) => l.id === tgt.layerId)
          if (!layer) return
          const patch = setLayerBoundsPatch(
            layer,
            { x: newX, y: newY },
            wrapMinDim,
          )
          if (patch) updateConfig(tgt.layerId, patch)
        } else {
          setCoverArtPosition({ x: newX, y: newY })
        }
      } else {
        // Resize — distance from centre to pointer in wrapper-local px.
        const rect = wrapperRef.current?.getBoundingClientRect()
        if (!rect) return
        const cxPx = dragState.startX * dragState.wrapperWidth
        const cyPx = dragState.startY * dragState.wrapperHeight
        const mouseRelX = e.clientX - rect.left
        const mouseRelY = e.clientY - rect.top
        const dxPx = mouseRelX - cxPx
        const dyPx = mouseRelY - cyPx
        const distance = Math.sqrt(dxPx * dxPx + dyPx * dyPx)
        if (tgt.kind === 'layer') {
          const layer = useLayerStore
            .getState()
            .layers.find((l) => l.id === tgt.layerId)
          if (!layer) return
          const range = getLayerSizeRange(layer.type)
          const clamped = Math.max(range.min, Math.min(range.max, distance))
          const patch = setLayerBoundsPatch(
            layer,
            { sizePx: clamped },
            wrapMinDim,
          )
          if (patch) updateConfig(tgt.layerId, patch)
        } else {
          const newLogoSize =
            wrapMinDim > 0 ? (distance * 2) / wrapMinDim : logoSize
          // setLogoSize clamps to [0.1, 1.0]
          setLogoSize(newLogoSize)
        }
      }
    },
    [dragState, updateConfig, setCoverArtPosition, setLogoSize, logoSize],
  )

  const onPointerUp = useCallback(() => {
    setDragState(null)
    // Clear the snap state on drag end so guides vanish immediately.
    // Visibility is gated by `dragState !== null` in the render path,
    // but resetting here too keeps the ref + React state coherent
    // for the next drag.
    snapRef.current = { snappedX: false, snappedY: false }
    setSnapVisible({ snappedX: false, snappedY: false })
  }, [])

  useEffect(() => {
    if (!dragState) return
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [dragState, onPointerMove, onPointerUp])

  // Pen Mode point-drag: stream pointer moves into updateShapePoint.
  const onPointPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!pointDrag) return
      const dx = e.clientX - pointDrag.startMouseX
      const dy = e.clientY - pointDrag.startMouseY
      const distSq = dx * dx + dy * dy
      const moved =
        pointDrag.moved ||
        distSq > POINT_CLICK_THRESHOLD_PX * POINT_CLICK_THRESHOLD_PX
      if (!moved) return
      const newX = Math.max(
        0,
        Math.min(1, pointDrag.startX + dx / pointDrag.wrapperWidth),
      )
      const newY = Math.max(
        0,
        Math.min(1, pointDrag.startY + dy / pointDrag.wrapperHeight),
      )
      updateShapePoint(pointDrag.layerId, pointDrag.index, {
        x: newX,
        y: newY,
      })
      if (!pointDrag.moved) {
        setPointDrag({ ...pointDrag, moved: true })
      }
    },
    [pointDrag, updateShapePoint],
  )

  const onPointPointerUp = useCallback(() => {
    setPointDrag(null)
  }, [])

  useEffect(() => {
    if (!pointDrag) return
    window.addEventListener('pointermove', onPointPointerMove)
    window.addEventListener('pointerup', onPointPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointPointerMove)
      window.removeEventListener('pointerup', onPointPointerUp)
    }
  }, [pointDrag, onPointPointerMove, onPointPointerUp])

  // Escape exits pen mode (in addition to deselecting selectables).
  useEffect(() => {
    if (!penMode) return
    const setPen = useLayerStore.getState().setPenToolActive
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [penMode])

  const handleCanvasClickAddPoint = (e: React.PointerEvent) => {
    if (!penMode || !activeShape || activeShape.locked) return
    // Only react to clicks on the catcher itself — not on numbered
    // handles (those have their own stopPropagation handlers).
    if (e.target !== e.currentTarget) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    addShapePoint(activeShape.id, {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    })
  }

  if (selectables.length === 0 && !penMode) return null

  // Centre guides are visible ONLY during an active drag OR resize
  // (pointer down on a layer body or corner handle), and only on
  // the axis that's currently snapped. Visibility is hard-gated by
  // dragState — hover, idle selection, and post-pointer-up all skip
  // the guides entirely. During resize, snap state is seeded from
  // the layer's centre at start so a centred layer keeps showing
  // the guide as confirmation while sizing.
  const showGuides = dragState !== null
  const guideTransition = prefersReducedMotion ? 'none' : 'opacity 80ms ease'

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none' }}
    >
      {/* Centre alignment guides. Always mounted (so the CSS
          transition has somewhere to interpolate from) but
          opacity-gated. Pointer-events: none so they don't fight
          the drag they're guiding. */}
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{
          left: '50%',
          width: 1,
          background: 'rgba(34,211,238,0.7)', // cyan accent
          boxShadow: '0 0 6px rgba(34,211,238,0.6)',
          opacity: showGuides && snapVisible.snappedX ? 1 : 0,
          transition: guideTransition,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{
          top: '50%',
          height: 1,
          background: 'rgba(34,211,238,0.7)',
          boxShadow: '0 0 6px rgba(34,211,238,0.6)',
          opacity: showGuides && snapVisible.snappedY ? 1 : 0,
          transition: guideTransition,
        }}
        aria-hidden="true"
      />
      {/* Centre crosshair badge: a small accented dot at the
          intersection when BOTH axes are snapped. Reads as a
          confirmation marker without adding clutter when only one
          axis is engaged. */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: '50%',
          top: '50%',
          width: 8,
          height: 8,
          marginLeft: -4,
          marginTop: -4,
          borderRadius: '50%',
          background: 'rgba(34,211,238,1)',
          boxShadow: '0 0 10px rgba(34,211,238,0.9)',
          opacity:
            showGuides && snapVisible.snappedX && snapVisible.snappedY ? 1 : 0,
          transition: guideTransition,
        }}
        aria-hidden="true"
      />

      {/* Deselect catcher: only active while something is selected so we
          don't block clicks on the underlying canvas in idle state. */}
      {selected && !penMode && (
        <div
          className="absolute inset-0"
          style={{ pointerEvents: 'auto' }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null)
          }}
          aria-hidden="true"
        />
      )}

      {/* Pen Mode click-catcher: takes precedence over selectables so
          empty-canvas clicks add a new point. Numbered handles render
          on top with their own pointer handlers. */}
      {penMode && activeShape && (
        <div
          className="absolute inset-0"
          style={{
            pointerEvents: 'auto',
            cursor: activeShape.locked ? 'not-allowed' : 'crosshair',
          }}
          onPointerDown={handleCanvasClickAddPoint}
          aria-label="Click to add shape point"
        />
      )}

      {selectables.map((sel) => {
        const id =
          sel.target.kind === 'layer' ? sel.target.layerId : 'logo'
        const isSelected = sameTarget(selected, sel.target)
        const isDragging =
          dragState !== null && sameTarget(dragState.target, sel.target)
        const boxSize = sel.sizePx * 2

        return (
          <div
            key={id}
            className="absolute"
            style={{
              left: `${sel.x * 100}%`,
              top: `${sel.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: boxSize,
              height: boxSize,
              cursor: sel.locked
                ? 'not-allowed'
                : isDragging
                  ? 'grabbing'
                  : 'grab',
              borderRadius: '50%',
              border: isSelected
                ? '1.5px solid rgba(59,130,246,0.8)'
                : '1.5px dashed transparent',
              pointerEvents: 'auto',
              transition: 'border-color 120ms ease',
            }}
            onPointerDown={(e) => startMove(e, sel)}
            onPointerEnter={(e) => {
              if (!isSelected && !sel.locked) {
                ;(e.currentTarget as HTMLDivElement).style.border =
                  '1.5px dashed rgba(255,255,255,0.4)'
              }
            }}
            onPointerLeave={(e) => {
              if (!isSelected) {
                ;(e.currentTarget as HTMLDivElement).style.border =
                  '1.5px dashed transparent'
              }
            }}
          >
            {isSelected && !sel.locked && (
              <>
                <div
                  className="absolute"
                  style={{
                    right: -7,
                    bottom: -7,
                    width: 14,
                    height: 14,
                    background: '#3b82f6',
                    border: '2px solid white',
                    borderRadius: '50%',
                    cursor: 'nwse-resize',
                    pointerEvents: 'auto',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  }}
                  onPointerDown={(e) => startResize(e, sel)}
                  aria-label="Resize"
                />
                <div
                  className="absolute"
                  style={{
                    right: -7,
                    top: -7,
                    width: 14,
                    height: 14,
                    background: '#3b82f6',
                    border: '2px solid white',
                    borderRadius: '50%',
                    cursor: 'nesw-resize',
                    pointerEvents: 'auto',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  }}
                  onPointerDown={(e) => startResize(e, sel)}
                  aria-label="Resize"
                />
              </>
            )}
          </div>
        )
      })}

      {selected && !dragState && !penMode && (
        <div
          className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] text-white/80 backdrop-blur"
          style={{
            background: 'rgba(0,0,0,0.6)',
            borderColor: 'rgba(255,255,255,0.1)',
            pointerEvents: 'none',
          }}
        >
          Drag to move · Corners to resize
        </div>
      )}

      {/* Pen Mode: numbered handles for each point + helper banner. The
          handles render on top of the click-catcher; their own
          stopPropagation prevents the catcher from also adding a point. */}
      {penMode && shapeCfg && activeShape && shapeCfg.points.map((pt, i) => {
        const isDragging =
          pointDrag !== null &&
          pointDrag.layerId === activeShape.id &&
          pointDrag.index === i
        return (
          <div
            key={i}
            className="absolute flex items-center justify-center"
            style={{
              left: `${pt.x * 100}%`,
              top: `${pt.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: isDragging ? '#8b5cf6' : '#3b82f6',
              border: '2px solid white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              cursor: isDragging ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
              userSelect: 'none',
              touchAction: 'none',
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              const rect = wrapperRef.current?.getBoundingClientRect()
              if (!rect) return
              ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
              setPointDrag({
                layerId: activeShape.id,
                index: i,
                startMouseX: e.clientX,
                startMouseY: e.clientY,
                startX: pt.x,
                startY: pt.y,
                wrapperWidth: rect.width,
                wrapperHeight: rect.height,
                moved: false,
              })
            }}
            onPointerUp={(e) => {
              // If the pointer never moved past the threshold, treat as
              // a "remove point" tap.
              if (
                pointDrag &&
                pointDrag.layerId === activeShape.id &&
                pointDrag.index === i &&
                !pointDrag.moved
              ) {
                e.stopPropagation()
                removeShapePoint(activeShape.id, i)
              }
            }}
            aria-label={`Point ${i + 1}`}
            title="Drag to move · Tap to remove"
          >
            {i + 1}
          </div>
        )
      })}

      {penMode && activeShape && (
        <div
          className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] text-white backdrop-blur"
          style={{
            background:
              'linear-gradient(90deg, rgba(59,130,246,0.85), rgba(139,92,246,0.85))',
            borderColor: 'rgba(255,255,255,0.2)',
            pointerEvents: 'none',
          }}
        >
          ✎ Pen Tool — click empty canvas to add · drag handles to move · tap to remove
        </div>
      )}
    </div>
  )
}

export default CanvasInteractiveOverlay
