import { useState } from 'react'
import { useStudioUIStore } from '@/store/useStudioUIStore'
import { useLayerStore } from '@/store/useLayerStore'
import { STUDIO_CATEGORIES, type CategoryConfig, type StudioCategory } from '@/types/studio'
import type { LayerType } from '@/types/layer'
import { CategoryIcon } from './CategoryIcon'
import { DraftConfirmDialog } from './DraftConfirmDialog'

function categoryToLayerType(id: string): LayerType | null {
  if (id === 'visualizer_bars') return 'bars'
  if (id === 'visualizer_circular') return 'circular'
  if (id === 'visualizer_wave') return 'wave'
  if (id === 'visualizer_polygon') return 'polygon'
  if (id === 'visualizer_bloom') return 'bloom'
  if (id === 'visualizer_shape') return 'shape'
  if (id === 'visualizer_video') return 'video'
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

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {STUDIO_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id
          const layerType = categoryToLayerType(cat.id)
          // Count committed layers of this type. The draft is intentionally
          // excluded so the badge reflects what's actually in the stack.
          const layerCount = layerType
            ? layers.filter((l) => l.type === layerType).length
            : null
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleClick(cat)}
              aria-pressed={isActive}
              aria-label={cat.label}
              className="relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all"
              style={{
                borderColor: isActive
                  ? 'rgba(59,130,246,0.5)'
                  : '#1f1f1f',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.05))'
                  : '#131313',
                boxShadow: isActive
                  ? '0 0 0 1px rgba(59,130,246,0.3), 0 8px 20px rgba(59,130,246,0.15)'
                  : 'none',
              }}
            >
              <CategoryIcon icon={cat.icon} size={30} />
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.85)',
                }}
              >
                {cat.label}
              </span>
              {cat.hasAI && (
                <div
                  className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-md text-[7px] font-bold text-white"
                  style={{
                    background:
                      'linear-gradient(135deg, #f59e0b, #ec4899)',
                  }}
                  aria-label="AI-assisted"
                >
                  AI
                </div>
              )}
              {layerCount === 0 && !cat.hasAI && (
                <div
                  className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#3b82f6] text-[8px] font-bold text-white"
                  aria-label="Click to add layer"
                  title="Click to add this layer"
                >
                  +
                </div>
              )}
              {layerCount !== null && layerCount > 0 && !cat.hasAI && (
                <div
                  className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[8px] font-bold text-black"
                  aria-label={`${layerCount} active layer${layerCount === 1 ? '' : 's'}`}
                  title={`${layerCount} active layer${layerCount === 1 ? '' : 's'} — click to add another`}
                >
                  {layerCount}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <DraftConfirmDialog
        open={pendingAction !== null}
        onAction={handleDialogAction}
      />
    </div>
  )
}

export default CategoryGrid
