import { Sparkles, X } from 'lucide-react'
import { useStudioUIStore } from '@/store/useStudioUIStore'
import { useLayerStore } from '@/store/useLayerStore'
import { STUDIO_CATEGORIES } from '@/types/studio'
import { BarsPanel } from './panels/BarsPanel'
import { CircularPanel } from './panels/CircularPanel'
import { WavePanel } from './panels/WavePanel'
import { PolygonPanel } from './panels/PolygonPanel'
import { BloomPanel } from './panels/BloomPanel'
import { CustomShapePanel } from './panels/CustomShapePanel'
import { ParticlesPanel } from './panels/ParticlesPanel'
import { VideoPanel } from './panels/VideoPanel'
import { BackgroundPanel } from './panels/BackgroundPanel'
import { LogoPanel } from './panels/LogoPanel'
import { TextPanel } from './panels/TextPanel'
import { AIStylePanel } from './AIStylePanel'
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
  'visualizer_shape',
  'visualizer_video',
  'visualizer_halo',
  'particles',
  'logo',
  'frame',
  'background',
  'text',
])

export function CategoryDetailPanel({ hideHeader = false }: Props = {}) {
  const activeCategory = useStudioUIStore((s) => s.activeCategory)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)
  const draftIsDirty = useLayerStore((s) => s.draftIsDirty)
  const setOpacity = useLayerStore((s) => s.setOpacity)
  // Includes the draft as a candidate, so the panel can edit a draft
  // before it's committed to the layers array.
  const activeLayer = useLayerStore((s) => {
    if (!s.activeLayerId) return undefined
    if (s.draftLayer && s.draftLayer.id === s.activeLayerId) return s.draftLayer
    return s.layers.find((l) => l.id === s.activeLayerId)
  })
  const draftLayer = useLayerStore((s) => s.draftLayer)
  const commitDraft = useLayerStore((s) => s.commitDraft)
  const discardDraft = useLayerStore((s) => s.discardDraft)
  const isDraft =
    draftLayer !== null && activeLayer?.id === draftLayer.id

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
        case 'shape':
          return <CustomShapePanel layerId={activeLayer.id} />
        case 'video':
          return <VideoPanel layerId={activeLayer.id} />
        case 'halo':
          // HaloPanel lands in commit 9. For now show a minimal
          // placeholder so the route resolves and the user sees a
          // useful message instead of a blank slot.
          return (
            <div className="p-4 text-center text-[11px] text-white/50">
              Halo controls coming up — the layer is rendering at
              defaults for now.
            </div>
          )
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
        return <AIStylePanel />
      default:
        return null
    }
  }

  const draftBanner = isDraft ? (
    <div
      className="mb-3 rounded-lg border p-3"
      style={{
        borderColor: 'rgba(139,92,246,0.4)',
        background:
          'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles
          className="h-3.5 w-3.5 text-purple-300"
          aria-hidden="true"
        />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-200">
          Draft Mode
        </span>
        {draftIsDirty && (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-medium"
            style={{
              background: 'rgba(245,158,11,0.2)',
              color: '#fbbf24',
            }}
          >
            • Unsaved
          </span>
        )}
      </div>
      <p className="mb-3 text-[11px] text-white/60">
        {draftIsDirty
          ? "You've made changes — save them as a layer or discard."
          : 'Adjust the settings below to customize this layer, then save it.'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => commitDraft()}
          className="flex-1 rounded-md px-3 py-2 text-[11px] font-medium text-white"
          style={{
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
          }}
        >
          + Save as Layer
        </button>
        <button
          type="button"
          onClick={() => discardDraft()}
          className="rounded-md border px-3 py-2 text-[11px] text-white/60 hover:border-red-400/40 hover:text-red-400"
          style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
        >
          Discard
        </button>
      </div>
    </div>
  ) : null

  // AI Style isn't backed by a layer — opacity card has nothing to bind to.
  const isAIStyle = activeCategory === 'ai_style'
  const opacityCard =
    activeLayer && !isAIStyle ? (
      <div
        className="mb-4 rounded-md border p-3"
        style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            Layer Opacity
          </span>
          <span className="text-[10px] tabular-nums text-white/60">
            {Math.round((activeLayer.opacity ?? 1) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round((activeLayer.opacity ?? 1) * 100)}
          onChange={(e) =>
            setOpacity(activeLayer.id, Number(e.target.value) / 100)
          }
          disabled={activeLayer.locked}
          className="auspec-slider w-full cursor-pointer"
          style={{ accentColor: '#3b82f6' }}
          aria-label="Layer opacity"
        />
      </div>
    ) : null

  if (hideHeader) {
    return (
      <div className="p-4">
        {draftBanner}
        {opacityCard}
        {renderPanel()}
      </div>
    )
  }

  // Show the active layer's name in the header when editing a layer,
  // otherwise fall back to the category label.
  const isLayerCategory = LAYER_CATEGORIES.has(activeCategory)
  const headerLabel =
    isLayerCategory && activeLayer
      ? isDraft
        ? `${activeLayer.name} · Draft`
        : activeLayer.name
      : cat.label

  return (
    <div
      className="mx-4 mb-4 rounded-xl border"
      style={{ borderColor: '#1f1f1f', background: '#131313' }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: '#1f1f1f' }}
      >
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
          {/* AI Style gets gradient-text on its title and a "Generate"
              suffix — different verb because AI synthesises a whole
              look instead of fine-tuning a single layer. */}
          {isAIStyle ? (
            <>
              <Sparkles
                className="h-3.5 w-3.5"
                aria-hidden="true"
                style={{ color: '#ec4899' }}
              />
              <span className="ai-gradient-text">AI Style</span>
              <span className="text-white/70">— Generate</span>
            </>
          ) : (
            <>{headerLabel} — Fine Tune</>
          )}
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
        {draftBanner}
        {opacityCard}
        {renderPanel()}
      </div>
    </div>
  )
}

export default CategoryDetailPanel
