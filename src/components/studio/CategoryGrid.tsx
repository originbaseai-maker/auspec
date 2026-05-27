import { useState } from 'react'
import { useStudioUIStore } from '@/store/useStudioUIStore'
import { useLayerStore } from '@/store/useLayerStore'
import { STUDIO_CATEGORIES, type CategoryConfig, type StudioCategory } from '@/types/studio'
import type { LayerType } from '@/types/layer'
import { useViewport } from '@/hooks/useViewport'
import { AIStyleButton } from './AIStyleButton'
import { CategoryIcon } from './CategoryIcon'
import { DraftConfirmDialog } from './DraftConfirmDialog'

interface ToolSection {
  title: string
  ids: StudioCategory[]
}

/**
 * Group the layer-creating categories into four thematic sections for
 * the Tools sheet. AI Style is intentionally absent — it has been
 * promoted to a hero card rendered ABOVE the grid (see AIHeroCard).
 * Any category present in STUDIO_CATEGORIES but missing here is
 * silently dropped from the grid, so keep this in sync when a new
 * category lands.
 */
const TOOL_SECTIONS: ToolSection[] = [
  {
    title: 'Waveform',
    ids: ['visualizer_bars', 'visualizer_wave', 'visualizer_bloom'],
  },
  {
    title: 'Geometric',
    ids: ['visualizer_circular', 'visualizer_polygon', 'visualizer_shape'],
  },
  {
    title: 'Effects',
    ids: ['particles', 'frame'],
  },
  {
    title: 'Assets & Stage',
    ids: ['background', 'logo', 'visualizer_video', 'text'],
  },
]

function categoryToLayerType(id: string): LayerType | null {
  if (id === 'visualizer_bars') return 'bars'
  if (id === 'visualizer_circular') return 'circular'
  if (id === 'visualizer_wave') return 'wave'
  if (id === 'visualizer_polygon') return 'polygon'
  if (id === 'visualizer_bloom') return 'bloom'
  if (id === 'visualizer_shape') return 'shape'
  if (id === 'visualizer_video') return 'video'
  if (id === 'visualizer_halo') return 'halo'
  if (id === 'particles') return 'particles'
  if (id === 'logo') return 'logo'
  if (id === 'frame') return 'frame'
  if (id === 'background') return 'background'
  if (id === 'text') return 'text'
  // ai_style — never (preset generator).
  return null
}

interface PendingAction {
  type: 'tile' | 'close'
  targetCategory?: StudioCategory
  targetLayerType?: LayerType
}

export function CategoryGrid() {
  const activeCategory = useStudioUIStore((s) => s.activeCategory)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)
  const layers = useLayerStore((s) => s.layers)
  const draftLayer = useLayerStore((s) => s.draftLayer)
  const draftIsDirty = useLayerStore((s) => s.draftIsDirty)
  const viewport = useViewport()
  const startDraft = useLayerStore((s) => s.startDraft)
  const commitDraft = useLayerStore((s) => s.commitDraft)
  const discardDraft = useLayerStore((s) => s.discardDraft)

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  )

  const hasDraft = draftLayer !== null

  const handleClick = (cat: CategoryConfig) => {
    if (cat.id === activeCategory) {
      // User wants to close the detail panel.
      if (hasDraft && draftIsDirty) {
        setPendingAction({ type: 'close' })
      } else {
        // No draft, or untouched draft → silent discard + close.
        if (hasDraft) discardDraft()
        setActiveCategory(null)
      }
      return
    }

    const layerType = categoryToLayerType(cat.id)

    if (hasDraft && draftIsDirty) {
      // Real changes pending — confirm before discarding.
      setPendingAction({
        type: 'tile',
        targetCategory: cat.id,
        targetLayerType: layerType ?? undefined,
      })
      return
    }

    // No draft OR untouched draft — proceed silently.
    if (hasDraft) discardDraft()
    if (layerType) {
      startDraft(layerType)
    }
    setActiveCategory(cat.id)
  }

  // AI Style activation routes through the same draft-dirty check
  // tool tiles use. The existing DraftConfirmDialog handler already
  // does the right thing for `targetCategory: 'ai_style'` —
  // targetLayerType is left undefined so no startDraft fires (AI
  // doesn't create a draft layer), and setActiveCategory('ai_style')
  // runs on save/discard.
  const handleAIActivate = () => {
    if (hasDraft && draftIsDirty) {
      setPendingAction({
        type: 'tile',
        targetCategory: 'ai_style',
      })
      return
    }
    if (hasDraft) discardDraft()
    setActiveCategory('ai_style')
  }

  const handleDialogAction = (action: 'save' | 'discard' | 'cancel') => {
    if (!pendingAction) return
    if (action === 'cancel') {
      setPendingAction(null)
      return
    }
    if (action === 'save') commitDraft()
    else discardDraft()

    if (pendingAction.type === 'close') {
      setActiveCategory(null)
    } else {
      if (pendingAction.targetLayerType) {
        startDraft(pendingAction.targetLayerType)
      }
      if (pendingAction.targetCategory) {
        setActiveCategory(pendingAction.targetCategory)
      }
    }
    setPendingAction(null)
  }

  // Look up the live CategoryConfig for a given id; if a section
  // references an id that's been removed, skip the tile silently.
  const lookupCat = (id: StudioCategory): CategoryConfig | undefined =>
    STUDIO_CATEGORIES.find((c) => c.id === id)

  const renderTile = (cat: CategoryConfig) => {
    const isActive = activeCategory === cat.id
    const layerType = categoryToLayerType(cat.id)
    const layerCount = layerType
      ? layers.filter((l) => l.type === layerType).length
      : null
    // "Has layers" → highlight border in accent color (per spec).
    const hasLayers = layerCount !== null && layerCount > 0

    // Tile state moves to data-* attributes so :hover CSS rules can
    // override border-color / box-shadow / background without losing
    // specificity to inline `style={{ ... }}` (inline always wins
    // unless we used !important — gross). The previous-batch hover
    // effect was silently broken for exactly this reason.
    const tileState = isActive ? 'active' : hasLayers ? 'has-layers' : 'idle'
    return (
      <button
        key={cat.id}
        type="button"
        onClick={() => handleClick(cat)}
        aria-pressed={isActive}
        aria-label={cat.label}
        data-state={tileState}
        data-dimmed={!hasLayers && !isActive && !cat.hasAI ? 'true' : undefined}
        className="auspec-tool-tile relative flex flex-col items-center justify-center gap-1 rounded-lg border p-1"
      >
        <CategoryIcon icon={cat.icon} size={20} />
        <span className="auspec-tool-tile-label text-[10px] font-medium leading-tight">
          {cat.label}
        </span>
        {cat.hasAI && (
          <div
            className="absolute right-0.5 top-0.5 flex h-3 w-3 items-center justify-center rounded text-[6px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
            }}
            aria-label="AI-assisted"
          >
            AI
          </div>
        )}
        {hasLayers && !cat.hasAI && (
          <div
            className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-400 px-1 text-[8px] font-bold leading-none text-black"
            aria-label={`${layerCount} active layer${layerCount === 1 ? '' : 's'}`}
            title={`${layerCount} active layer${layerCount === 1 ? '' : 's'} — tap to add another`}
          >
            {layerCount}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-3 p-2">
      {TOOL_SECTIONS.map((section) => {
        const tiles = section.ids
          .map(lookupCat)
          .filter((c): c is CategoryConfig => c !== undefined)
        if (tiles.length === 0) return null
        return (
          <section key={section.title}>
            <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {section.title}
            </p>
            {/* Fixed-size tiles via auto-fill + justify-content:start.
                Sections with fewer tiles than the row can hold leave
                empty space on the right — deliberate signal of "fewer
                options here", not a layout bug. */}
            <div className="auspec-tool-grid">{tiles.map(renderTile)}</div>
          </section>
        )
      })}

      {/* Primary CTA — rendered AFTER the four tool sections so AI
          Style is the visual anchor at the bottom of the Tools panel
          on both mobile and desktop. Variant follows the viewport
          breakpoint (height differs slightly between them). */}
      <div className="pt-1">
        <AIStyleButton
          variant={viewport === 'mobile' ? 'mobile' : 'desktop'}
          onRequestActivate={handleAIActivate}
        />
      </div>

      <DraftConfirmDialog
        open={pendingAction !== null}
        onAction={handleDialogAction}
      />
    </div>
  )
}

export default CategoryGrid
