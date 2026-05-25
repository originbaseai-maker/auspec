import type { JSX } from 'react'
import {
  AudioWaveform,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Circle,
  Eye,
  EyeOff,
  Hexagon,
  Lock,
  Unlock,
  type LucideIcon,
} from 'lucide-react'
import { useLayerStore } from '@/store/useLayerStore'
import { useStudioUIStore } from '@/store/useStudioUIStore'
import type { StudioCategory } from '@/types/studio'
import type { Layer, LayerType } from '@/types/layer'

const LAYER_ICONS: Record<LayerType, LucideIcon> = {
  bars: BarChart3,
  circular: Circle,
  wave: AudioWaveform,
  polygon: Hexagon,
}

const CATEGORY_MAP: Record<LayerType, StudioCategory> = {
  bars: 'visualizer_bars',
  circular: 'visualizer_circular',
  wave: 'visualizer_wave',
  polygon: 'visualizer_polygon',
}

/**
 * Compact "Layers" panel — lists the four visualizer layers in z-order
 * with eye / lock toggles and up/down chevrons for reordering. Mounts at
 * the top of PresetsSidebar on desktop and inside the Presets mobile
 * bottom sheet.
 *
 * Drag-and-drop is intentionally deferred to Part 2 — chevrons cover the
 * same functional need with simpler code and consistent touch behavior.
 */
export function LayerSidebar(): JSX.Element {
  const layers = useLayerStore((s) => s.layers)
  const activeLayerId = useLayerStore((s) => s.activeLayerId)
  const toggleEnabled = useLayerStore((s) => s.toggleEnabled)
  const toggleLocked = useLayerStore((s) => s.toggleLocked)
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer)
  const moveLayerToIndex = useLayerStore((s) => s.moveLayerToIndex)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)

  const ordered = Object.values(layers).sort((a, b) => a.zOrder - b.zOrder)
  // Display in reverse: highest z (front-most) at the top of the list,
  // matching Photoshop / Canva convention.
  const displayed = [...ordered].reverse()
  const enabledLayers = displayed.filter((l) => l.enabled)
  const disabledLayers = displayed.filter((l) => !l.enabled)

  const handleLayerClick = (layer: Layer) => {
    setActiveLayer(layer.id)
    setActiveCategory(CATEGORY_MAP[layer.id])
  }

  const moveUp = (layer: Layer) => {
    // "Up" in displayed list = higher z-order. Convert via ascending list.
    const ascIdx = ordered.findIndex((l) => l.id === layer.id)
    if (ascIdx === ordered.length - 1) return
    moveLayerToIndex(layer.id, ascIdx + 1)
  }

  const moveDown = (layer: Layer) => {
    const ascIdx = ordered.findIndex((l) => l.id === layer.id)
    if (ascIdx === 0) return
    moveLayerToIndex(layer.id, ascIdx - 1)
  }

  const renderRow = (layer: Layer) => {
    const Icon = LAYER_ICONS[layer.id]
    const isActive = activeLayerId === layer.id
    const ascIdx = ordered.findIndex((l) => l.id === layer.id)
    const canMoveUp = layer.enabled && ascIdx < ordered.length - 1
    const canMoveDown = layer.enabled && ascIdx > 0

    return (
      <div
        key={layer.id}
        onClick={() => handleLayerClick(layer)}
        className="group flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 transition-colors"
        style={{
          borderColor: isActive ? '#3b82f6' : '#2a2a2a',
          background: isActive ? 'rgba(59,130,246,0.08)' : '#0f0f0f',
          opacity: layer.enabled ? 1 : 0.55,
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleEnabled(layer.id)
          }}
          aria-label={layer.enabled ? `Hide ${layer.name}` : `Show ${layer.name}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/60 hover:text-white"
        >
          {layer.enabled ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>

        <Icon className="h-3.5 w-3.5 shrink-0 text-white/60" aria-hidden="true" />

        <span className="flex-1 truncate text-[12px] text-white/90">
          {layer.name}
        </span>

        {layer.enabled && (
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

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleLocked(layer.id)
          }}
          aria-label={layer.locked ? `Unlock ${layer.name}` : `Lock ${layer.name}`}
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
        <span className="text-[10px] text-white/40">
          {enabledLayers.length} active
        </span>
      </div>

      <div className="space-y-1 p-2">
        {enabledLayers.length === 0 ? (
          <div
            className="rounded-md border-2 border-dashed px-3 py-3 text-center text-[10px] text-white/40"
            style={{ borderColor: '#2a2a2a' }}
          >
            No active layers. Click a visualizer category on the right to add
            one.
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
    </section>
  )
}

export default LayerSidebar
