import { FolderOpen, CircleDot, Waves, BarChart3 } from 'lucide-react'
import { BUILT_IN_PRESETS, type Preset } from '@/lib/presets'
import { useVisualizerStore } from '@/store/useVisualizerStore'

function PresetIcon({ visualType }: { visualType: Preset['visualType'] }) {
  if (visualType === 'circular') return <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
  if (visualType === 'wave') return <Waves className="h-3.5 w-3.5" aria-hidden="true" />
  return <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
}

function presetGradient(preset: Preset): string {
  const cfg = preset.config
  let start = '#3b82f6'
  let end = '#8b5cf6'
  if (preset.visualType === 'bars' && cfg.linearBars) {
    start = cfg.linearBars.colorStart
    end = cfg.linearBars.colorEnd
  } else if (preset.visualType === 'circular' && cfg.circularSpectrum) {
    start = cfg.circularSpectrum.colorStart
    end = cfg.circularSpectrum.colorEnd
  } else if (preset.visualType === 'wave' && cfg.wave) {
    start = cfg.wave.colorStart
    end = cfg.wave.colorEnd
  }
  return `linear-gradient(135deg, ${start} 0%, ${end} 100%)`
}

export function PresetsSidebar() {
  const activePresetId = useVisualizerStore((s) => s.activePresetId)
  const applyPreset = useVisualizerStore((s) => s.applyPreset)

  return (
    <aside
      className="hidden md:flex w-[220px] shrink-0 flex-col border-r bg-[#111111] overflow-y-auto"
      style={{ borderColor: '#2a2a2a' }}
      aria-label="Presets and projects"
    >
      <div className="p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-3">
          Presets
        </h2>
        <ul className="space-y-2">
          {BUILT_IN_PRESETS.map((preset) => {
            const active = activePresetId === preset.id
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => applyPreset(preset)}
                  aria-pressed={active}
                  className="group flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.12) 100%)'
                      : '#1a1a1a',
                    borderColor: active ? '#8b5cf6' : '#2a2a2a',
                  }}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-full"
                    style={{ background: presetGradient(preset) }}
                    aria-hidden="true"
                  />
                  <span className="flex flex-col leading-tight min-w-0">
                    <span className="flex items-center gap-1.5 text-white/90 truncate">
                      <PresetIcon visualType={preset.visualType} />
                      <span className="truncate">{preset.name}</span>
                    </span>
                    {preset.description && (
                      <span className="text-[10px] text-white/40 truncate">
                        {preset.description}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div
        className="mt-2 border-t p-4"
        style={{ borderColor: '#2a2a2a' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-3">
          Projects
        </h2>
        <div
          className="flex flex-col items-center justify-center rounded-md border border-dashed px-3 py-6 text-center opacity-50 cursor-not-allowed select-none"
          style={{ borderColor: '#2a2a2a' }}
          aria-disabled="true"
        >
          <FolderOpen className="h-5 w-5 text-white/60 mb-2" aria-hidden="true" />
          <p className="text-xs text-white/70 leading-snug">
            Save your first project
          </p>
        </div>
      </div>
    </aside>
  )
}

export default PresetsSidebar
