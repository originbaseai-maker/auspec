import { Sparkles } from 'lucide-react'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { ColorRow, PanelGroup } from './shared'

export function ColorsPanel() {
  const visualType = useVisualizerStore((s) => s.visualType)
  const config = useVisualizerStore((s) => s.visualizerConfig)
  const updateLinearBars = useVisualizerStore((s) => s.updateLinearBars)
  const updateCircularSpectrum = useVisualizerStore(
    (s) => s.updateCircularSpectrum,
  )
  const updateWave = useVisualizerStore((s) => s.updateWave)
  const updatePolygon = useVisualizerStore((s) => s.updatePolygon)

  const primary =
    visualType === 'bars'
      ? config.linearBars.colorStart
      : visualType === 'circular'
        ? config.circularSpectrum.colorStart
        : visualType === 'polygon'
          ? config.polygon.colorStart
          : config.wave.colorStart

  const secondary =
    visualType === 'bars'
      ? config.linearBars.colorEnd
      : visualType === 'circular'
        ? config.circularSpectrum.colorEnd
        : visualType === 'polygon'
          ? config.polygon.colorEnd
          : config.wave.colorEnd

  const setPrimary = (color: string) => {
    if (visualType === 'bars') updateLinearBars({ colorStart: color })
    else if (visualType === 'circular')
      updateCircularSpectrum({ colorStart: color })
    else if (visualType === 'wave') updateWave({ colorStart: color })
    else if (visualType === 'polygon') updatePolygon({ colorStart: color })
  }
  const setSecondary = (color: string) => {
    if (visualType === 'bars') updateLinearBars({ colorEnd: color })
    else if (visualType === 'circular')
      updateCircularSpectrum({ colorEnd: color })
    else if (visualType === 'wave') updateWave({ colorEnd: color })
    else if (visualType === 'polygon') updatePolygon({ colorEnd: color })
  }

  return (
    <div className="space-y-5">
      <PanelGroup title="Primary">
        <ColorRow
          value={primary}
          onChange={setPrimary}
          ariaLabel="primary color"
        />
      </PanelGroup>

      <PanelGroup title="Secondary">
        <ColorRow
          value={secondary}
          onChange={setSecondary}
          ariaLabel="secondary color"
        />
      </PanelGroup>

      <div
        className="flex items-start gap-2 rounded-md border p-3"
        style={{
          borderColor: 'rgba(245,158,11,0.2)',
          background:
            'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(236,72,153,0.05))',
        }}
      >
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        <div>
          <p className="text-[11px] font-medium text-white">AI Style</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-white/50">
            Describe a vibe like "sunset over the ocean" and let AI pick a
            palette. Coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ColorsPanel
