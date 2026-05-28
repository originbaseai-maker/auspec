import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
} from 'react'
import { useLayerStore } from '@/store/useLayerStore'
import type { Layer, TextLayerConfig } from '@/types/layer'

interface DragState {
  layerId: string
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  wrapperWidth: number
  wrapperHeight: number
}

/**
 * Transparent HTML overlay above the canvas that makes TextLayers
 * directly interactive. The canvas still paints the visible text — these
 * elements just provide hit-targets for drag/edit.
 *
 *   • Single click  → select (blue outline)
 *   • Drag          → updates layer's x/y; canvas repaints
 *   • Double-click  → opens inline input; canvas suppresses that layer
 *                     via `editingTextLayerId`
 *   • Click background area → deselect / cancel edit
 *
 * Iterates all enabled `type: 'text'` layers — Part 2C-2 made text
 * multi-instance, so users can have any number of text elements.
 */
export function TextInteractive(): JSX.Element | null {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const layers = useLayerStore((s) => s.layers)
  const editingLayerId = useLayerStore((s) => s.editingTextLayerId)
  const setEditingLayerId = useLayerStore((s) => s.setEditingTextLayerId)
  const updateConfig = useLayerStore((s) => s.updateConfig)

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

  useEffect(() => {
    if (editingLayerId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingLayerId])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState) return
      const dx = (e.clientX - dragState.startMouseX) / dragState.wrapperWidth
      const dy = (e.clientY - dragState.startMouseY) / dragState.wrapperHeight
      const newX = Math.max(0, Math.min(1, dragState.startX + dx))
      const newY = Math.max(0, Math.min(1, dragState.startY + dy))
      updateConfig(dragState.layerId, { x: newX, y: newY })
    },
    [dragState, updateConfig],
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

  const startDrag = (
    layer: Layer & { type: 'text'; config: TextLayerConfig },
    e: React.PointerEvent,
  ) => {
    if (editingLayerId === layer.id) return
    if (layer.locked) return
    const wrapper = wrapperRef.current?.getBoundingClientRect()
    if (!wrapper) return
    e.preventDefault()
    e.stopPropagation()
    setSelectedLayerId(layer.id)
    setDragState({
      layerId: layer.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: layer.config.x,
      startY: layer.config.y,
      wrapperWidth: wrapper.width,
      wrapperHeight: wrapper.height,
    })
  }

  const startEdit = (id: string, locked: boolean) => {
    if (locked) return
    setEditingLayerId(id)
    setSelectedLayerId(id)
  }

  const commitEdit = (newText: string) => {
    if (editingLayerId) {
      updateConfig(editingLayerId, { text: newText })
      setEditingLayerId(null)
    }
  }

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return
    setSelectedLayerId(null)
    if (editingLayerId) setEditingLayerId(null)
  }

  // Visible text layers — enabled + has text (or is being edited).
  const visibleLayers = layers.filter(
    (l): l is Layer & { type: 'text'; config: TextLayerConfig } =>
      l.type === 'text' &&
      l.enabled &&
      (l.config.text.trim().length > 0 || editingLayerId === l.id),
  )

  if (visibleLayers.length === 0) return null

  // Wrapper is pointer-transparent so pointerdowns on the canvas
  // (outside any text-box hit area) fall through to the sibling
  // CanvasInteractiveOverlay's layer-drag handlers. Without this,
  // loading audio — which auto-creates the Artist + Title text
  // layers via setAudioFile → addLayerImmediate('text') — silently
  // mounted this wrapper as `pointerEvents: 'auto'`, stealing every
  // click on the canvas and breaking visualizer drag/resize.
  //
  // The deselect-on-tap-off behaviour is preserved by a separate
  // catcher rendered only while something IS selected or editing —
  // same pattern CanvasInteractiveOverlay uses for its deselect
  // catcher, so the two overlays now compose cleanly.
  const showDeselectCatcher =
    selectedLayerId !== null || editingLayerId !== null
  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: 'none', background: 'transparent' }}
    >
      {showDeselectCatcher && (
        <div
          className="absolute inset-0"
          style={{ pointerEvents: 'auto' }}
          onPointerDown={handleBackgroundPointerDown}
          aria-hidden="true"
        />
      )}
      {visibleLayers.map((layer) => {
        const isSelected = selectedLayerId === layer.id
        const isEditing = editingLayerId === layer.id
        const isDragging = dragState?.layerId === layer.id
        const cfg = layer.config

        return (
          <div
            key={layer.id}
            className="absolute"
            style={{
              // Each text box opts into pointer events explicitly so
              // it's tappable for drag / double-click-to-edit — the
              // parent wrapper is now `pointer-events: none`, so
              // without this opt-in the boxes wouldn't receive
              // pointerdowns either.
              pointerEvents: 'auto',
              left: `${cfg.x * 100}%`,
              top: `${cfg.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              cursor: layer.locked
                ? 'not-allowed'
                : isEditing
                  ? 'text'
                  : isDragging
                    ? 'grabbing'
                    : 'grab',
              userSelect: 'none',
              fontFamily: `"${cfg.font}", sans-serif`,
              fontWeight: cfg.fontWeight,
              fontSize: `${cfg.fontSize}px`,
              // While editing, show the actual color so the input is
              // legible; otherwise the canvas already paints the text and
              // the HTML span is a transparent hit-target sized to match.
              color: isEditing ? cfg.color : 'transparent',
              letterSpacing: `${cfg.letterSpacing}px`,
              padding: '4px 8px',
              whiteSpace: 'nowrap',
              border:
                isSelected && !isEditing
                  ? '1.5px solid rgba(59,130,246,0.8)'
                  : '1.5px solid transparent',
              borderRadius: 4,
              background: isEditing ? 'rgba(15,15,15,0.85)' : 'transparent',
              boxShadow: isEditing ? '0 4px 20px rgba(0,0,0,0.6)' : undefined,
              transition: 'border-color 120ms ease, background 120ms ease',
            }}
            onPointerDown={(e) => startDrag(layer, e)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              startEdit(layer.id, layer.locked)
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !isEditing && !layer.locked) {
                ;(e.currentTarget as HTMLDivElement).style.border =
                  '1.5px dashed rgba(255,255,255,0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected && !isEditing) {
                ;(e.currentTarget as HTMLDivElement).style.border =
                  '1.5px solid transparent'
              }
            }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                defaultValue={cfg.text}
                onPointerDown={(e) => e.stopPropagation()}
                onBlur={(e) => commitEdit(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') {
                    commitEdit((e.target as HTMLInputElement).value)
                  } else if (e.key === 'Escape') {
                    setEditingLayerId(null)
                  }
                }}
                placeholder="Type here..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: cfg.color,
                  font: 'inherit',
                  letterSpacing: 'inherit',
                  minWidth: 100,
                  width: 'auto',
                  textAlign: 'center',
                  padding: 0,
                }}
              />
            ) : (
              <span>{cfg.text || ' '}</span>
            )}
          </div>
        )
      })}

      {selectedLayerId && !editingLayerId && (
        <div
          className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] text-white/80 backdrop-blur"
          style={{
            background: 'rgba(0,0,0,0.6)',
            borderColor: 'rgba(255,255,255,0.1)',
            pointerEvents: 'none',
          }}
        >
          Drag to move · Double-click to edit
        </div>
      )}
    </div>
  )
}

export default TextInteractive
