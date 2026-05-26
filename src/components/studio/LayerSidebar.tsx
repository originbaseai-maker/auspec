import { useRef, useState, type JSX } from 'react'
import {
  AudioWaveform,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Hexagon,
  Flower2,
  Image as ImageIcon,
  Layers as LayersIcon,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Type as TypeIcon,
  Unlock,
  type LucideIcon,
} from 'lucide-react'
import { useLayerStore } from '@/store/useLayerStore'
import { useStudioUIStore } from '@/store/useStudioUIStore'
import { DraftConfirmDialog } from './DraftConfirmDialog'
import type { StudioCategory } from '@/types/studio'
import {
  LAYER_LABELS,
  LAYER_TYPES,
  type Layer,
  type LayerType,
} from '@/types/layer'

const LAYER_ICONS: Record<LayerType, LucideIcon> = {
  bars: BarChart3,
  circular: Circle,
  wave: AudioWaveform,
  polygon: Hexagon,
  bloom: Flower2,
  particles: Sparkles,
  logo: ImageIcon,
  frame: Square,
  background: LayersIcon,
  text: TypeIcon,
}

const CATEGORY_MAP: Record<LayerType, StudioCategory> = {
  bars: 'visualizer_bars',
  circular: 'visualizer_circular',
  wave: 'visualizer_wave',
  polygon: 'visualizer_polygon',
  bloom: 'visualizer_bloom',
  particles: 'particles',
  logo: 'logo',
  frame: 'frame',
  background: 'background',
  text: 'text',
}

interface ContextMenuState {
  layerId: string
  x: number
  y: number
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[12px] hover:bg-white/5"
      style={{ color: danger ? '#ef4444' : 'rgba(255,255,255,0.85)' }}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  )
}

/**
 * Multi-instance Layers panel.
 *
 * - "+ Add Layer" dropdown (Bars / Circular / Wave / Polygon)
 * - Row click → select for editing
 * - Eye toggle / Lock toggle / up-down chevrons
 * - Native HTML5 drag-and-drop reorder (desktop; touch falls back to chevrons)
 * - Right-click → context menu (Rename, Duplicate, Reset, Move to top/
 *   bottom, Delete)
 * - Double-click name → inline rename
 */
export function LayerSidebar(): JSX.Element {
  const layers = useLayerStore((s) => s.layers)
  const activeLayerId = useLayerStore((s) => s.activeLayerId)
  const draftLayer = useLayerStore((s) => s.draftLayer)
  const toggleEnabled = useLayerStore((s) => s.toggleEnabled)
  const toggleLocked = useLayerStore((s) => s.toggleLocked)
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer)
  const moveLayerToIndex = useLayerStore((s) => s.moveLayerToIndex)
  const addLayer = useLayerStore((s) => s.addLayer)
  const commitDraft = useLayerStore((s) => s.commitDraft)
  const discardDraft = useLayerStore((s) => s.discardDraft)
  const removeLayer = useLayerStore((s) => s.removeLayer)
  const duplicateLayer = useLayerStore((s) => s.duplicateLayer)
  const renameLayer = useLayerStore((s) => s.renameLayer)
  const resetLayer = useLayerStore((s) => s.resetLayer)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)

  const [showAddMenu, setShowAddMenu] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  // Pending-action slots — when set, the DraftConfirmDialog is shown
  // and resolves the queued action on Save/Discard.
  const [pendingLayerSelect, setPendingLayerSelect] = useState<string | null>(
    null,
  )
  const [pendingAdd, setPendingAdd] = useState<LayerType | null>(null)

  const hasDraft = draftLayer !== null

  const ordered = [...layers].sort(
    (a, b) => a.zOrder - b.zOrder || a.createdAt - b.createdAt,
  )
  const displayed = [...ordered].reverse()
  const enabledLayers = displayed.filter((l) => l.enabled)
  const disabledLayers = displayed.filter((l) => !l.enabled)

  const handleRowClick = (layer: Layer) => {
    if (renamingId === layer.id) return
    // Selecting an existing layer while a draft exists triggers the
    // confirm dialog. Clicking the draft itself is fine (it's already
    // active by definition).
    if (hasDraft && layer.id !== draftLayer?.id) {
      setPendingLayerSelect(layer.id)
      return
    }
    setActiveLayer(layer.id)
    setActiveCategory(CATEGORY_MAP[layer.type])
  }

  const handleAdd = (type: LayerType) => {
    if (hasDraft) {
      setPendingAdd(type)
      setShowAddMenu(false)
      return
    }
    addLayer(type) // wraps startDraft internally now
    setActiveCategory(CATEGORY_MAP[type])
    setShowAddMenu(false)
  }

  const resolvePendingLayerSelect = (
    action: 'save' | 'discard' | 'cancel',
  ) => {
    if (!pendingLayerSelect) return
    if (action === 'cancel') {
      setPendingLayerSelect(null)
      return
    }
    if (action === 'save') commitDraft()
    else discardDraft()
    const targetId = pendingLayerSelect
    setActiveLayer(targetId)
    const layer = useLayerStore.getState().getLayerById(targetId)
    if (layer) setActiveCategory(CATEGORY_MAP[layer.type])
    setPendingLayerSelect(null)
  }

  const resolvePendingAdd = (action: 'save' | 'discard' | 'cancel') => {
    if (!pendingAdd) return
    if (action === 'cancel') {
      setPendingAdd(null)
      return
    }
    if (action === 'save') commitDraft()
    else discardDraft()
    addLayer(pendingAdd) // starts a fresh draft of the requested type
    setActiveCategory(CATEGORY_MAP[pendingAdd])
    setPendingAdd(null)
  }

  const startRename = (layer: Layer) => {
    setRenamingId(layer.id)
    setRenameDraft(layer.name)
    setContextMenu(null)
    // Focus + select happens on next tick when the input has mounted.
    setTimeout(() => renameInputRef.current?.select(), 0)
  }

  const commitRename = () => {
    if (renamingId) {
      renameLayer(renamingId, renameDraft)
      setRenamingId(null)
    }
  }

  const moveUp = (layer: Layer) => {
    const ascIdx = ordered.findIndex((l) => l.id === layer.id)
    if (ascIdx === ordered.length - 1) return
    moveLayerToIndex(layer.id, ascIdx + 1)
  }
  const moveDown = (layer: Layer) => {
    const ascIdx = ordered.findIndex((l) => l.id === layer.id)
    if (ascIdx === 0) return
    moveLayerToIndex(layer.id, ascIdx - 1)
  }
  const moveToTop = (layer: Layer) => {
    moveLayerToIndex(layer.id, ordered.length - 1)
    setContextMenu(null)
  }
  const moveToBottom = (layer: Layer) => {
    moveLayerToIndex(layer.id, 0)
    setContextMenu(null)
  }

  const handleDragStart = (e: React.DragEvent, layer: Layer) => {
    if (!layer.enabled || renamingId === layer.id) {
      e.preventDefault()
      return
    }
    setDraggedId(layer.id)
    e.dataTransfer.effectAllowed = 'move'
    // Firefox requires setData to actually start the drag.
    e.dataTransfer.setData('text/plain', layer.id)
  }

  const handleDragOver = (e: React.DragEvent, targetLayer: Layer) => {
    if (!draggedId || draggedId === targetLayer.id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(targetLayer.id)
  }

  const handleDragLeave = () => setDragOverId(null)

  const handleDrop = (e: React.DragEvent, targetLayer: Layer) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetLayer.id) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    // Convert "displayed-list" index (front-on-top) back to ascending z.
    const targetDisplayIdx = displayed.findIndex((l) => l.id === targetLayer.id)
    const targetAscIdx = ordered.length - 1 - targetDisplayIdx
    moveLayerToIndex(draggedId, targetAscIdx)
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleContextMenu = (e: React.MouseEvent, layer: Layer) => {
    e.preventDefault()
    setContextMenu({ layerId: layer.id, x: e.clientX, y: e.clientY })
  }

  const renderRow = (layer: Layer) => {
    const Icon = LAYER_ICONS[layer.type]
    const isActive = activeLayerId === layer.id
    const isRenaming = renamingId === layer.id
    const ascIdx = ordered.findIndex((l) => l.id === layer.id)
    const canMoveUp = layer.enabled && ascIdx < ordered.length - 1
    const canMoveDown = layer.enabled && ascIdx > 0
    const isDraggedTarget = dragOverId === layer.id

    return (
      <div
        key={layer.id}
        draggable={layer.enabled && !isRenaming}
        onDragStart={(e) => handleDragStart(e, layer)}
        onDragOver={(e) => handleDragOver(e, layer)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, layer)}
        onDragEnd={handleDragEnd}
        onClick={() => handleRowClick(layer)}
        onContextMenu={(e) => handleContextMenu(e, layer)}
        onDoubleClick={(e) => {
          if (e.target instanceof HTMLElement && e.target.tagName !== 'BUTTON') {
            startRename(layer)
          }
        }}
        className="group flex items-center gap-1.5 rounded-md border px-2 py-1.5 transition-all"
        style={{
          borderColor: isActive
            ? '#3b82f6'
            : isDraggedTarget
              ? '#10b981'
              : '#2a2a2a',
          background: isActive
            ? 'rgba(59,130,246,0.08)'
            : isDraggedTarget
              ? 'rgba(16,185,129,0.05)'
              : '#0f0f0f',
          opacity:
            draggedId === layer.id ? 0.4 : layer.enabled ? 1 : 0.55,
          cursor: layer.enabled && !isRenaming ? 'grab' : 'default',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleEnabled(layer.id)
          }}
          aria-label={
            layer.enabled ? `Hide ${layer.name}` : `Show ${layer.name}`
          }
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/60 hover:text-white"
        >
          {layer.enabled ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>

        <Icon
          className="h-3.5 w-3.5 shrink-0 text-white/60"
          aria-hidden="true"
        />

        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commitRename()
              else if (e.key === 'Escape') setRenamingId(null)
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded border bg-[#0f0f0f] px-1 py-0.5 text-[12px] text-white outline-none focus:border-[#3b82f6]"
            style={{ borderColor: '#3b82f6' }}
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate text-[12px] text-white/90">
            {layer.name}
          </span>
        )}

        {layer.enabled && !isRenaming && (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                moveUp(layer)
              }}
              disabled={!canMoveUp}
              aria-label={`Move ${layer.name} forward`}
              title="Move forward (in front)"
              className="flex h-3 w-4 items-center justify-center rounded text-white/40 hover:text-white disabled:opacity-20"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                moveDown(layer)
              }}
              disabled={!canMoveDown}
              aria-label={`Move ${layer.name} backward`}
              title="Move backward (behind)"
              className="flex h-3 w-4 items-center justify-center rounded text-white/40 hover:text-white disabled:opacity-20"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}

        {!isRenaming && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleLocked(layer.id)
            }}
            aria-label={
              layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`
            }
            title={
              layer.locked
                ? 'Locked — click to unlock'
                : 'Click to lock and prevent edits'
            }
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/40 hover:text-white"
          >
            {layer.locked ? (
              <Lock className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <section className="border-b" style={{ borderColor: '#2a2a2a' }}>
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: '#1f1f1f' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/80">
          Layers
        </h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            aria-label="Add layer"
            aria-haspopup="menu"
            aria-expanded={showAddMenu}
            className="flex h-6 w-6 items-center justify-center rounded-md border text-white/60 hover:text-white"
            style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {showAddMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAddMenu(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border p-1 shadow-2xl"
                style={{ borderColor: '#2a2a2a', background: '#131313' }}
              >
                <p className="px-2 py-1 text-[9px] uppercase tracking-wider text-white/40">
                  Add layer
                </p>
                {LAYER_TYPES.map((type) => {
                  const Icon = LAYER_ICONS[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      role="menuitem"
                      onClick={() => handleAdd(type)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[12px] text-white/80 hover:bg-white/5 hover:text-white"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {LAYER_LABELS[type]}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1 p-2">
        {enabledLayers.length === 0 ? (
          <div
            className="rounded-md border-2 border-dashed px-3 py-3 text-center text-[10px] text-white/40"
            style={{ borderColor: '#2a2a2a' }}
          >
            No active layers. Click + to add one.
          </div>
        ) : (
          enabledLayers.map(renderRow)
        )}
      </div>

      {disabledLayers.length > 0 && (
        <div className="px-2 pb-3">
          <p className="px-1 py-1 text-[9px] uppercase tracking-wider text-white/30">
            Hidden ({disabledLayers.length})
          </p>
          <div className="space-y-1">{disabledLayers.map(renderRow)}</div>
        </div>
      )}

      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="fixed z-50 w-44 rounded-lg border p-1 shadow-2xl"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              borderColor: '#2a2a2a',
              background: '#131313',
            }}
          >
            {(() => {
              const layer = layers.find((l) => l.id === contextMenu.layerId)
              if (!layer) return null
              return (
                <>
                  <MenuItem
                    icon={Pencil}
                    label="Rename"
                    onClick={() => startRename(layer)}
                  />
                  <MenuItem
                    icon={Copy}
                    label="Duplicate"
                    onClick={() => {
                      duplicateLayer(layer.id)
                      setContextMenu(null)
                    }}
                  />
                  <MenuItem
                    icon={RotateCcw}
                    label="Reset settings"
                    onClick={() => {
                      resetLayer(layer.id)
                      setContextMenu(null)
                    }}
                  />
                  <div className="my-1 h-px bg-white/10" />
                  <MenuItem
                    icon={ChevronUp}
                    label="Move to top"
                    onClick={() => moveToTop(layer)}
                  />
                  <MenuItem
                    icon={ChevronDown}
                    label="Move to bottom"
                    onClick={() => moveToBottom(layer)}
                  />
                  <div className="my-1 h-px bg-white/10" />
                  <MenuItem
                    icon={Trash2}
                    label="Delete"
                    danger
                    onClick={() => {
                      removeLayer(layer.id)
                      setContextMenu(null)
                    }}
                  />
                </>
              )
            })()}
          </div>
        </>
      )}
    <DraftConfirmDialog
        open={pendingLayerSelect !== null}
        onAction={resolvePendingLayerSelect}
      />
      <DraftConfirmDialog
        open={pendingAdd !== null}
        onAction={resolvePendingAdd}
      />
    </section>
  )
}

export default LayerSidebar
