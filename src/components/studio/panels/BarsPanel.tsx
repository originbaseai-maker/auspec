import { useLayerStore } from '@/store/useLayerStore'
import type { LinearBarsConfig } from '@/lib/renderers/linearBars'
import {
  FreqRangeBlock,
  LockedLayerBanner,
  PaletteEditor,
  PanelGroup,
  SegmentedGroup,
  SensitivityBlock,
  Slider,
  SliderRow,
  Toggle,
} from './shared'

type DisplayMode = 'digital' | 'analog_lines' | 'analog_dots'
type SideMode = 'both' | 'side_a' | 'side_b'

const DISPLAY_MODES = [
  { id: 'digital' as const, label: 'Digital' },
  { id: 'analog_lines' as const, label: 'Lines' },
  { id: 'analog_dots' as const, label: 'Dots' },
]

const SIDE_MODES = [
  { id: 'both' as const, label: 'Both' },
  { id: 'side_a' as const, label: 'Side A' },
  { id: 'side_b' as const, label: 'Side B' },
]

type Patch = Partial<LinearBarsConfig> & {
  displayMode?: DisplayMode
  hueInterpolation?: number
  startFrequency?: number
  endFrequency?: number
  sideMode?: SideMode
}

interface Props {
  layerId: string
}

export function BarsPanel({ layerId }: Props) {
  const layer = useLayerStore((s) =>
    s.layers.find((l) => l.id === layerId && l.type === 'bars'),
  )
  const updateConfig = useLayerStore((s) => s.updateConfig)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a layer in the Layers sidebar.
      </div>
    )
  }

  const cfg = layer.config as LinearBarsConfig
  const isLocked = layer.locked

  const update: (p: Patch) => void = (p) => updateConfig(layerId, p)

  const ext = cfg as LinearBarsConfig & {
    displayMode?: DisplayMode
    hueInterpolation?: number
    startFrequency?: number
    endFrequency?: number
    sideMode?: SideMode
  }

  const displayMode: DisplayMode = ext.displayMode ?? 'digital'
  const hueInterpolation = ext.hueInterpolation ?? 0
  const startFrequency = ext.startFrequency ?? 20
  const endFrequency = ext.endFrequency ?? 20000
  const sideMode: SideMode = ext.sideMode ?? 'both'

  return (
    <div
      className="space-y-5"
      style={{
        opacity: isLocked ? 0.5 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
      }}
    >
      {isLocked && <LockedLayerBanner />}
      <div className="space-y-5">
      <PanelGroup title="Colors">
        <PaletteEditor
          palette={cfg.palette}
          onChange={(palette) => update({ palette })}
          fallbackStart={cfg.colorStart}
          fallbackEnd={cfg.colorEnd}
        />
      </PanelGroup>

      <PanelGroup title="Sensitivity">
        <SensitivityBlock
          bass={cfg.bassSensitivity ?? 1}
          mid={cfg.midSensitivity ?? 1}
          treble={cfg.trebleSensitivity ?? 1}
          onChange={(band, value) => {
            const key =
              band === 'bass'
                ? 'bassSensitivity'
                : band === 'mid'
                  ? 'midSensitivity'
                  : 'trebleSensitivity'
            update({ [key]: value })
          }}
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

      <PanelGroup title="Display Mode">
        <SegmentedGroup
          options={DISPLAY_MODES}
          value={displayMode}
          onChange={(id) => update({ displayMode: id })}
          cols={3}
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

      <PanelGroup title="Mirror">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Symmetric</span>
          <Toggle
            checked={cfg.mirrorMode}
            onChange={(v) => update({ mirrorMode: v })}
            ariaLabel="Mirror mode"
          />
        </div>
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
        <p className="mt-1 text-[9px] text-white/30">
          0 = gradient · 180 = rainbow · 360 = full cycle
        </p>
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
    </div>
  )
}

export default BarsPanel
