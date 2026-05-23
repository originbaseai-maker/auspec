import { X } from 'lucide-react'
import { useStudioUIStore } from '@/store/useStudioUIStore'
import { STUDIO_CATEGORIES } from '@/types/studio'
import { BarsPanel } from './panels/BarsPanel'
import { CircularPanel } from './panels/CircularPanel'
import { WavePanel } from './panels/WavePanel'
import { PolygonPanel } from './panels/PolygonPanel'
import { ParticlesPanel } from './panels/ParticlesPanel'
import { BackgroundPanel } from './panels/BackgroundPanel'
import { LogoPanel } from './panels/LogoPanel'
import { ColorsPanel } from './panels/ColorsPanel'
import { FramePanel } from './panels/FramePanel'

export function CategoryDetailPanel() {
  const activeCategory = useStudioUIStore((s) => s.activeCategory)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)

  if (!activeCategory) return null

  const cat = STUDIO_CATEGORIES.find((c) => c.id === activeCategory)
  if (!cat) return null

  const renderPanel = () => {
    switch (activeCategory) {
      case 'visualizer_bars':
        return <BarsPanel />
      case 'visualizer_circular':
        return <CircularPanel />
      case 'visualizer_wave':
        return <WavePanel />
      case 'visualizer_polygon':
        return <PolygonPanel />
      case 'particles':
        return <ParticlesPanel />
      case 'background':
        return <BackgroundPanel />
      case 'logo':
        return <LogoPanel />
      case 'colors':
        return <ColorsPanel />
      case 'frame':
        return <FramePanel />
      default:
        return null
    }
  }

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
          {cat.label} — Fine Tune
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
