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

type SelectableTarget =
  | { kind: 'layer'; layerId: string }
  | { kind: 'logo' }

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
  const activeLayerId = useLayerStore((s) => s.activeLayerId)
  const updateConfig = useLayerStore((s) => s.updateConfig)
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer)

  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)

  // Cover art store doubles as the logo store — coverArtPosition is
  // shared between cover art + logo, logoSize controls logo render scale.
  const logo = useCoverArtStore((s) => s.logo)
  const coverArtPosition = useCoverArtStore((s) => s.coverArtPosition)
  const logoSize = useCoverArtStore((s) => s.logoSize)
  const setCoverArtPosition = useCoverArtStore((s) => s.setCoverArtPosition)
  const setLogoSize = useCoverArtStore((s) => s.setLogoSize)

  const [selected, setSelected] = useState<SelectableTarget | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [wrapperSize, setWrapperSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
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

  // Auto-sync selection with the active layer when it's a circular or
  // polygon layer. Clicking a layer row in the sidebar selects it here.
  useEffect(() => {
    if (!activeLayerId) return
    const layer = layers.find((l) => l.id === activeLayerId)
    if (layer && (layer.type === 'circular' || layer.type === 'polygon')) {
      setSelected({ kind: 'layer', layerId: layer.id })
    }
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

  const selectables: Selectable[] = []
  for (const layer of layers) {
    if (!layer.enabled) continue
    if (layer.type === 'circular') {
      const cfg = layer.config as {
        offsetX?: number
        offsetY?: number
        radius?: number
      }
      selectables.push({
        target: { kind: 'layer', layerId: layer.id },
        x: cfg.offsetX ?? 0.5,
        y: cfg.offsetY ?? 0.5,
        sizePx: Math.max(20, cfg.radius ?? 100),
        locked: layer.locked,
      })
    } else if (layer.type === 'polygon') {
      const cfg = layer.config as {
        offsetX?: number
        offsetY?: number
        radius?: number
      }
      selectables.push({
        target: { kind: 'layer', layerId: layer.id },
        x: cfg.offsetX ?? 0.5,
        y: cfg.offsetY ?? 0.5,
        sizePx: Math.max(20, cfg.radius ?? 100),
        locked: layer.locked,
      })
    }
  }
  if (logo && minDim > 0) {
    selectables.push({
      target: { kind: 'logo' },
      x: coverArtPosition.x,
      y: coverArtPosition.y,
      sizePx: Math.max(20, (minDim * logoSize) / 2),
      locked: false,
    })
  }

  const startMove = (e: React.PointerEvent, sel: Selectable) => {
    if (sel.locked) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    e.preventDefault()
    e.stopPropagation()
    setSelected(sel.target)
    if (sel.target.kind === 'layer') {
      const tgt = sel.target
      setActiveLayer(tgt.layerId)
      const l = layers.find((x) => x.id === tgt.layerId)
      if (l) {
        const cat: StudioCategory =
          l.type === 'circular' ? 'visualizer_circular' : 'visualizer_polygon'
        setActiveCategory(cat)
      }
    } else {
      setActiveCategory('logo')
    }
    setDragState({
      target: sel.target,
      mode: 'move',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: sel.x,
      startY: sel.y,
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

      if (dragState.mode === 'move') {
        const dx = (e.clientX - dragState.startMouseX) / dragState.wrapperWidth
        const dy = (e.clientY - dragState.startMouseY) / dragState.wrapperHeight
        const newX = Math.max(0, Math.min(1, dragState.startX + dx))
        const newY = Math.max(0, Math.min(1, dragState.startY + dy))
        if (tgt.kind === 'layer') {
          updateConfig(tgt.layerId, { offsetX: newX, offsetY: newY })
        } else {
          setCoverArtPosition({ x: newX, y: newY })
        }
      } else {
        // Resize — distance from center to pointer in wrapper-local pixels.
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
          const newRadius = Math.max(20, Math.min(500, distance))
          updateConfig(tgt.layerId, { radius: newRadius })
        } else {
          // Logo: distance is the requested half-extent in wrapper px;
          // store value is fraction of minDim.
          const minDimWrap = Math.min(
            dragState.wrapperWidth,
            dragState.wrapperHeight,
          )
          const newLogoSize =
            minDimWrap > 0 ? (distance * 2) / minDimWrap : logoSize
          // setLogoSize clamps to [0.1, 1.0]
          setLogoSize(newLogoSize)
        }
      }
    },
    [dragState, updateConfig, setCoverArtPosition, setLogoSize, logoSize],
  )

  const onPointerUp = useCallback(() => {
    setDragState(null)
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

  if (selectables.length === 0) return null

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none' }}
    >
      {/* Deselect catcher: only active while something is selected so we
          don't block clicks on the underlying canvas in idle state. */}
      {selected && (
        <div
          className="absolute inset-0"
          style={{ pointerEvents: 'auto' }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null)
          }}
          aria-hidden="true"
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

      {selected && !dragState && (
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
    </div>
  )
}

export default CanvasInteractiveOverlay
