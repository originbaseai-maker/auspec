import { LayoutGrid, Layers as LayersIcon, Music, type LucideIcon } from 'lucide-react'
import type { JSX } from 'react'

export type MobileTabId = 'presets' | 'layers' | 'tools'

interface Props {
  activeTab: MobileTabId | null
  onTabChange: (tab: MobileTabId | null) => void
}

const TABS: { id: MobileTabId; label: string; icon: LucideIcon }[] = [
  { id: 'presets', label: 'Presets', icon: Music },
  { id: 'layers', label: 'Layers', icon: LayersIcon },
  { id: 'tools', label: 'Tools', icon: LayoutGrid },
]

export function MobileBottomTabs({ activeTab, onTabChange }: Props): JSX.Element {
  return (
    <nav
      // Pinned at viewport bottom above the iOS safe-area inset.
      // z-[60] sits above the sheet's z-50 so the tabs stay tappable
      // while a sheet is open — letting the user switch sheets without
      // closing first.
      className="fixed bottom-0 left-0 right-0 z-[60] flex items-center justify-around border-t bg-[#0a0a0a] px-2 py-2"
      style={{
        borderColor: '#1a1a1a',
        paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Mobile studio tabs"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(active ? null : tab.id)}
            aria-pressed={active}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 transition-colors"
            style={{
              background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
              color: active ? '#3b82f6' : 'rgba(255,255,255,0.6)',
            }}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default MobileBottomTabs
