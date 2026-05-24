import { useVisualizerStore } from '@/store/useVisualizerStore'
import type { CircularSpectrumConfig } from '@/lib/renderers/circularSpectrum'
import {
  FreqRangeBlock,
  PaletteEditor,
  PanelGroup,
  SegmentedGroup,
  Slider,
  SliderRow,
  Toggle,
} from './shared'

type SideMode = 'both' | 'side_a' | 'side_b'

const SIDE_MODES = [
  { id: 'both' as const, label: 'Both' },
  { id: 'side_a' as const, label: 'Side A' },
  { id: 'side_b' as const, label: 'Side B' },
]

type Patch = Partial<CircularSpectrumConfig> & {
  hueInterpolation?: number
  startFrequency?: number
  endFrequency?: number
  sideMode?: SideMode
}

export function CircularPanel() {
  const cfg = useVisualizerStore((s) => s.visualizerConfig.circularSpectrum)
  const update = useVisualizerStore((s) => s.updateCircularSpectrum) as (
    p: Patch,
  ) => void

  const ext = cfg as CircularSpectrumConfig & {
    hueInterpolation?: number
    startFrequency?: number
    endFrequency?: number
    sideMode?: SideMode
  }
  const hueInterpolation = ext.hueInterpolation ?? 0
  const startFrequency = ext.startFrequency ?? 20
  const endFrequency = ext.endFrequency ?? 20000
  const sideMode: SideMode = ext.sideMode ?? 'both'

  return (
    <div className="space-y-5">
      <PanelGroup title="Colors">
        <PaletteEditor
          palette={cfg.palette}
          onChange={(palette) => update({ palette })}
          fallbackStart={cfg.colorStart}
          fallbackEnd={cfg.colorEnd}
        />
      </PanelGroup>

      <PanelGroup title="Radius" hint={`${Math.round(cfg.radius)}px`}>
        <Slider
          value={cfg.radius}
          min={40}
          max={400}
          step={1}
          onChange={(v) => update({ radius: v })}
          ariaLabel="Radius"
        />
      </PanelGroup>

      <PanelGroup title="Inner Radius" hint={`${Math.round(cfg.innerRadius)}px`}>
        <Slider
          value={cfg.innerRadius}
          min={0}
          max={300}
          step={1}
          onChange={(v) => update({ innerRadius: v })}
          ariaLabel="Inner radius"
        />
      </PanelGroup>

      <PanelGroup title="Bar Count" hint={`${cfg.barCount}`}>
        <Slider
          value={cfg.barCount}
          min={32}
          max={256}
          step={1}
          onChange={(v) => update({ barCount: Math.round(v) })}
          ariaLabel="Bar count"
        />
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

      <PanelGroup title="Rotation" hint={`${Math.round(cfg.rotation)}°`}>
        <Slider
          value={cfg.rotation}
          min={0}
          max={360}
          step={1}
          onChange={(v) => update({ rotation: v })}
          ariaLabel="Rotation"
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

      <PanelGroup title="Bass Pulse">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/70">Inner circle reacts</span>
          <Toggle
            checked={cfg.bassPulse}
            onChange={(v) => update({ bassPulse: v })}
            ariaLabel="Bass pulse"
          />
        </div>
      </PanelGroup>

      <PanelGroup title="Direction">
        <SegmentedGroup
          options={SIDE_MODES}
          value={sideMode}
          onChange={(id) => update({ sideMode: id })}
          cols={3}
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

export default CircularPanel
