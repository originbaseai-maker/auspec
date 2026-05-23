import { useStudioUIStore } from '@/store/useStudioUIStore'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { STUDIO_CATEGORIES, type CategoryConfig } from '@/types/studio'
import { CategoryIcon } from './CategoryIcon'

type VisualizerType = 'bars' | 'circular' | 'wave' | 'polygon'

export function CategoryGrid() {
  const activeCategory = useStudioUIStore((s) => s.activeCategory)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)
  const setVisualType = useVisualizerStore((s) => s.setVisualType)

  const handleClick = (cat: CategoryConfig) => {
    if (cat.id === activeCategory) {
      setActiveCategory(null)
      return
    }
    if (cat.id.startsWith('visualizer_')) {
      const visualType = cat.id.replace('visualizer_', '') as VisualizerType
      setVisualType(visualType)
    }
    setActiveCategory(cat.id)
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-2">
        {STUDIO_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleClick(cat)}
              aria-pressed={isActive}
              aria-label={cat.label}
              className="relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all"
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
              <CategoryIcon icon={cat.icon} size={36} />
              <span
                className="text-[11px] font-medium"
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
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CategoryGrid
