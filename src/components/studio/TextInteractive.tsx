import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
} from 'react'
import {
  useTextStore,
  type TextLayer,
  type TextLayerId,
} from '@/store/useTextStore'

interface DragState {
  layerId: TextLayerId
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  wrapperWidth: number
  wrapperHeight: number
}

/**
 * Transparent HTML overlay that sits on top of the canvas to make text
 * directly interactive. The canvas still paints the visible text — these
 * elements just provide hit-targets for drag/edit.
 *
 *   • Single click: select (shows selection outline)
 *   • Drag: move the layer; updates store x/y, canvas repaints
 *   • Double-click: open inline input; canvas suppresses that layer
 *     while editing (via `editingLayerId`)
 *   • Click background (transparent area): deselect / cancel edit
 */
export function TextInteractive(): JSX.Element | null {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const title = useTextStore((s) => s.title)
  const artist = useTextStore((s) => s.artist)
  const custom = useTextStore((s) => s.custom)
  const editingLayerId = useTextStore((s) => s.editingLayerId)
  const setLayer = useTextStore((s) => s.setLayer)
  const setEditingLayerId = useTextStore((s) => s.setEditingLayerId)

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<TextLayerId | null>(
    null,
  )

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
      setLayer(dragState.layerId, { x: newX, y: newY })
    },
    [dragState, setLayer],
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

  const startDrag = (layer: TextLayer, e: React.PointerEvent) => {
    if (editingLayerId === layer.id) return
    const wrapper = wrapperRef.current?.getBoundingClientRect()
    if (!wrapper) return
    e.preventDefault()
    e.stopPropagation()
    setSelectedLayerId(layer.id)
    setDragState({
      layerId: layer.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: layer.x,
      startY: layer.y,
      wrapperWidth: wrapper.width,
      wrapperHeight: wrapper.height,
    })
  }

  const startEdit = (layer: TextLayer) => {
    setEditingLayerId(layer.id)
    setSelectedLayerId(layer.id)
  }

  const commitEdit = (newText: string) => {
    if (editingLayerId) {
      setLayer(editingLayerId, { text: newText })
      setEditingLayerId(null)
    }
  }

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return
    setSelectedLayerId(null)
    if (editingLayerId) setEditingLayerId(null)
  }

  const visibleLayers = [title, artist, custom].filter(
    (l) => l.enabled && (l.text.trim() || editingLayerId === l.id),
  )

  if (visibleLayers.length === 0) return null

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-10"
      onPointerDown={handleBackgroundPointerDown}
      style={{ pointerEvents: 'auto', background: 'transparent' }}
    >
      {visibleLayers.map((layer) => {
        const isSelected = selectedLayerId === layer.id
        const isEditing = editingLayerId === layer.id
        const isDragging = dragState?.layerId === layer.id

        return (
          <div
            key={layer.id}
            className="absolute"
            style={{
              left: `${layer.x * 100}%`,
              top: `${layer.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              fontFamily: `"${layer.font}", sans-serif`,
              fontWeight: layer.fontWeight,
              fontSize: `${layer.fontSize}px`,
              // While editing we show the actual color so the input is
              // legible; otherwise the canvas already paints the text, so
              // the HTML span is a transparent hit-target sized to match.
              color: isEditing ? layer.color : 'transparent',
              letterSpacing: `${layer.letterSpacing}px`,
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
              startEdit(layer)
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !isEditing) {
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
                defaultValue={layer.text}
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
                  color: layer.color,
                  font: 'inherit',
                  letterSpacing: 'inherit',
                  minWidth: 100,
                  width: 'auto',
                  textAlign: 'center',
                  padding: 0,
                }}
              />
            ) : (
              // Transparent span sized to match the canvas text so the
              // outline/cursor align with what the user sees.
              <span>{layer.text || ' '}</span>
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
