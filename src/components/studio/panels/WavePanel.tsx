import { useVisualizerStore } from '@/store/useVisualizerStore'
import type { WaveConfig } from '@/lib/renderers/wave'
import {
  FreqRangeBlock,
  PanelGroup,
  SegmentedGroup,
  Slider,
  SliderRow,
  Toggle,
} from './shared'

type DisplayMode = 'digital' | 'analog_lines' | 'analog_dots'

const DISPLAY_MODES = [
  { id: 'digital' as const, label: 'Digital' },
  { id: 'analog_lines' as const, label: 'Lines' },
  { id: 'analog_dots' as const, label: 'Dots' },
]

type Patch = Partial<WaveConfig> & {
  displayMode?: DisplayMode
  hueInterpolation?: number
  startFrequency?: number
  endFrequency?: number
}

export function WavePanel() {
  const cfg = useVisualizerStore((s) => s.visualizerConfig.wave)
  const update = useVisualizerStore((s) => s.updateWave) as (p: Patch) => void

  const ext = cfg as WaveConfig & {
    displayMode?: DisplayMode
    hueInterpolation?: number
    startFrequency?: number
    endFrequency?: number
  }
  const displayMode: DisplayMode = ext.displayMode ?? 'digital'
  const hueInterpolation = ext.hueInterpolation ?? 0
  const startFrequency = ext.startFrequency ?? 20
  const endFrequency = ext.endFrequency ?? 20000

  return (
    <div className="space-y-5">
      <PanelGroup
        title="Line Thickness"
        hint={`${cfg.lineThickness}px`}
      >
        <Slider
          value={cfg.lineThickness}
          min={1}
          max={12}
          step={0.5}
          onChange={(v) => update({ lineThickness: v })}
          ariaLabel="Line thickness"
        />
      </PanelGroup>

      <PanelGroup title="Display Mode">
        <SegmentedGroup
          options={DISPLAY_MODES}
          value={displayMode}
          onChange={(id) => update({ displayMode: id })}
          cols={3}
        />
      </PanelGroup>

      <PanelGroup title="Fill">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/70">Filled</span>
          <Toggle
            checked={cfg.filled}
            onChange={(v) => update({ filled: v })}
            ariaLabel="Filled"
          />
        </div>
      </PanelGroup>

      <PanelGroup title="Mirror">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/70">Symmetric</span>
          <Toggle
            checked={cfg.mirrorMode}
            onChange={(v) => update({ mirrorMode: v })}
            ariaLabel="Mirror"
          />
        </div>
      </PanelGroup>

      <PanelGroup title="Smoothing" hint={cfg.smoothing.toFixed(2)}>
        <Slider
          value={cfg.smoothing}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update({ smoothing: v })}
          ariaLabel="Smoothing"
        />
      </PanelGroup>

      <PanelGroup title="Glow">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Enabled</span>
          <Toggle
            checked={cfg.glowEnabled}
            onChange={(v) => update({ glowEnabled: v })}
            ariaLabel="Glow"
          />
        </div>
        <SliderRow
          label="Intensity"
          hint={Math.round(cfg.glowIntensity).toString()}
          value={cfg.glowIntensity}
          min={0}
          max={20}
          step={0.5}
          onChange={(v) => update({ glowIntensity: v })}
          ariaLabel="Glow intensity"
        />
      </PanelGroup>

      <PanelGroup
        title="Hue Shift"
        hint={hueInterpolation === 0 ? 'Off' : `${hueInterpolation}°`}
      >
        <Slider
          value={hueInterpolation}
          min={0}
          max={360}
          step={5}
          onChange={(v) => update({ hueInterpolation: v })}
          ariaLabel="Hue interpolation"
        />
      </PanelGroup>

      <PanelGroup title="Frequency Range">
        <FreqRangeBlock
          start={startFrequency}
          end={endFrequency}
          setStart={(v) => update({ startFrequency: v })}
          setEnd={(v) => update({ endFrequency: v })}
        />
      </PanelGroup>
    </div>
  )
}

export default WavePanel
