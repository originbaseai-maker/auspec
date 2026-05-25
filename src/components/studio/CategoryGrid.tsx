import { useStudioUIStore } from '@/store/useStudioUIStore'
import { useLayerStore } from '@/store/useLayerStore'
import { STUDIO_CATEGORIES, type CategoryConfig } from '@/types/studio'
import type { LayerType } from '@/types/layer'
import { CategoryIcon } from './CategoryIcon'

function categoryToLayerType(id: string): LayerType | null {
  if (id === 'visualizer_bars') return 'bars'
  if (id === 'visualizer_circular') return 'circular'
  if (id === 'visualizer_wave') return 'wave'
  if (id === 'visualizer_polygon') return 'polygon'
  return null
}

export function CategoryGrid() {
  const activeCategory = useStudioUIStore((s) => s.activeCategory)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)
  const layers = useLayerStore((s) => s.layers)
  const setEnabled = useLayerStore((s) => s.setEnabled)
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer)

  const handleClick = (cat: CategoryConfig) => {
    if (cat.id === activeCategory) {
      setActiveCategory(null)
      return
    }
    // For a visualizer-type tile, ENABLE its layer and make it the
    // active editing target (instead of switching exclusive visualType).
    const layerType = categoryToLayerType(cat.id)
    if (layerType) {
      setEnabled(layerType, true)
      setActiveLayer(layerType)
    }
    setActiveCategory(cat.id)
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {STUDIO_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id
          const layerType = categoryToLayerType(cat.id)
          const layerEnabled = layerType ? layers[layerType].enabled : null
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
              {/* Layer state badge: small "+" when adding will enable the
                  layer; green dot when the layer is already enabled. */}
              {layerEnabled === false && !cat.hasAI && (
                <div
                  className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#3b82f6] text-[8px] font-bold text-white"
                  aria-label="Click to add layer"
                  title="Click to add this layer"
                >
                  +
                </div>
              )}
              {layerEnabled === true && !cat.hasAI && (
                <div
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400"
                  aria-label="Layer active"
                  title="Layer is currently active"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CategoryGrid
