import { X } from 'lucide-react'
import { useStudioUIStore } from '@/store/useStudioUIStore'
import { useLayerStore } from '@/store/useLayerStore'
import { STUDIO_CATEGORIES } from '@/types/studio'
import { BarsPanel } from './panels/BarsPanel'
import { CircularPanel } from './panels/CircularPanel'
import { WavePanel } from './panels/WavePanel'
import { PolygonPanel } from './panels/PolygonPanel'
import { BloomPanel } from './panels/BloomPanel'
import { ParticlesPanel } from './panels/ParticlesPanel'
import { BackgroundPanel } from './panels/BackgroundPanel'
import { LogoPanel } from './panels/LogoPanel'
import { TextPanel } from './panels/TextPanel'
import { AIPanel } from './panels/AIPanel'
import { FramePanel } from './panels/FramePanel'

interface Props {
  /**
   * When true, skip the panel's own card chrome (border, title row,
   * internal X button) and let the surrounding container provide them.
   * Used inside the mobile bottom sheet which has its own header.
   */
  hideHeader?: boolean
}

/**
 * Categories whose detail panel routes through the active layer (i.e.
 * the user can have multiple layers of this type). Background/Text/AI
 * Style remain singleton-overlay categories handled in the default switch.
 */
const LAYER_CATEGORIES = new Set([
  'visualizer_bars',
  'visualizer_circular',
  'visualizer_wave',
  'visualizer_polygon',
  'visualizer_bloom',
  'particles',
  'logo',
  'frame',
  'background',
  'text',
])

export function CategoryDetailPanel({ hideHeader = false }: Props = {}) {
  const activeCategory = useStudioUIStore((s) => s.activeCategory)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)
  const activeLayer = useLayerStore((s) =>
    s.layers.find((l) => l.id === s.activeLayerId),
  )

  if (!activeCategory) return null

  const cat = STUDIO_CATEGORIES.find((c) => c.id === activeCategory)
  if (!cat) return null

  const renderPanel = () => {
    // Layer-backed categories route by the ACTIVE LAYER's type — the
    // category just opens a panel; the layer determines which one.
    if (LAYER_CATEGORIES.has(activeCategory)) {
      if (!activeLayer) {
        return (
          <div className="p-6 text-center text-[11px] text-white/50">
            No layer selected. Click a layer in the sidebar to edit it.
          </div>
        )
      }
      switch (activeLayer.type) {
        case 'bars':
          return <BarsPanel layerId={activeLayer.id} />
        case 'circular':
          return <CircularPanel layerId={activeLayer.id} />
        case 'wave':
          return <WavePanel layerId={activeLayer.id} />
        case 'polygon':
          return <PolygonPanel layerId={activeLayer.id} />
        case 'bloom':
          return <BloomPanel layerId={activeLayer.id} />
        case 'particles':
          return <ParticlesPanel layerId={activeLayer.id} />
        case 'logo':
          return <LogoPanel layerId={activeLayer.id} />
        case 'frame':
          return <FramePanel layerId={activeLayer.id} />
        case 'background':
          return <BackgroundPanel layerId={activeLayer.id} />
        case 'text':
          return <TextPanel layerId={activeLayer.id} />
      }
    }

    // Only AI Style remains as a non-layer singleton (preset generator).
    switch (activeCategory) {
      case 'ai_style':
        return <AIPanel />
      default:
        return null
    }
  }

  if (hideHeader) {
    return <div className="p-4">{renderPanel()}</div>
  }

  // Show the active layer's name in the header when editing a layer,
  // otherwise fall back to the category label.
  const isLayerCategory = LAYER_CATEGORIES.has(activeCategory)
  const headerLabel =
    isLayerCategory && activeLayer ? activeLayer.name : cat.label

  return (
    <div
      className="mx-4 mb-4 rounded-xl border"
      style={{ borderColor: '#1f1f1f', background: '#131313' }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: '#1f1f1f' }}
      >
        <h3 className="text-xs font-semibold text-white/90">
          {headerLabel} — Fine Tune
        </h3>
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          aria-label="Close panel"
          className="rounded p-1 text-white/40 hover:text-white transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-[calc(100vh-400px)] overflow-y-auto p-4">
        {renderPanel()}
      </div>
    </div>
  )
}

export default CategoryDetailPanel
