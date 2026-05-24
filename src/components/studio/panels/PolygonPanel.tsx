import { useVisualizerStore } from '@/store/useVisualizerStore'
import type {
  PolygonShape,
  PolygonSpectrumConfig,
} from '@/lib/renderers/polygonSpectrum'
import {
  ColorRow,
  FreqRangeBlock,
  PanelGroup,
  SegmentedGroup,
  Slider,
  SliderRow,
  Toggle,
} from './shared'

const POLYGON_SHAPES: { id: PolygonShape; glyph: string }[] = [
  { id: 'triangle', glyph: '△' },
  { id: 'square', glyph: '□' },
  { id: 'pentagon', glyph: '⬠' },
  { id: 'hexagon', glyph: '⬡' },
  { id: 'star', glyph: '✦' },
  { id: 'diamond', glyph: '◇' },
]

const BAR_DIRECTIONS = [
  { id: 'outward' as const, label: 'Outward' },
  { id: 'inward' as const, label: 'Inward' },
  { id: 'both' as const, label: 'Both' },
]

type Patch = Partial<PolygonSpectrumConfig> & {
  hueInterpolation?: number
  startFrequency?: number
  endFrequency?: number
}

export function PolygonPanel() {
  const cfg = useVisualizerStore((s) => s.visualizerConfig.polygon)
  const update = useVisualizerStore((s) => s.updatePolygon) as (
    p: Patch,
  ) => void

  const ext = cfg as PolygonSpectrumConfig & {
    hueInterpolation?: number
    startFrequency?: number
    endFrequency?: number
  }
  const hueInterpolation = ext.hueInterpolation ?? 0
  const startFrequency = ext.startFrequency ?? 20
  const endFrequency = ext.endFrequency ?? 20000

  return (
    <div className="space-y-5">
      <PanelGroup title="Colors">
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Primary
            </p>
            <ColorRow
              value={cfg.colorStart}
              onChange={(c) => update({ colorStart: c })}
              ariaLabel="primary color"
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Secondary
            </p>
            <ColorRow
              value={cfg.colorEnd}
              onChange={(c) => update({ colorEnd: c })}
              ariaLabel="secondary color"
            />
          </div>
        </div>
      </PanelGroup>

      <PanelGroup title="Shape">
        <div className="grid grid-cols-3 gap-2">
          {POLYGON_SHAPES.map(({ id, glyph }) => {
            const active = cfg.shape === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => update({ shape: id })}
                aria-pressed={active}
                className="flex flex-col items-center rounded-md border py-2 transition-all"
                style={{
                  borderColor: active ? '#8b5cf6' : '#2a2a2a',
                  background: active
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18))'
                    : '#1a1a1a',
                }}
              >
                <span className="text-lg leading-none text-white">{glyph}</span>
                <span className="mt-0.5 text-[9px] capitalize text-white/50">
                  {id}
                </span>
              </button>
            )
          })}
        </div>
      </PanelGroup>

      <PanelGroup title="Radius" hint={`${Math.round(cfg.radius)}px`}>
        <Slider
          value={cfg.radius}
          min={40}
          max={400}
          step={1}
          onChange={(v) => update({ radius: v })}
          ariaLabel="Polygon radius"
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

      <PanelGroup title="Fill">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Fill shape</span>
          <Toggle
            checked={cfg.fillShape}
            onChange={(v) => update({ fillShape: v })}
            ariaLabel="Fill shape"
          />
        </div>
        <SliderRow
          label="Fill opacity"
          hint={cfg.fillOpacity.toFixed(2)}
          value={cfg.fillOpacity}
          min={0}
          max={0.5}
          step={0.01}
          onChange={(v) => update({ fillOpacity: v })}
          ariaLabel="Fill opacity"
        />
      </PanelGroup>

      <PanelGroup title="Bar Direction">
        <SegmentedGroup
          options={BAR_DIRECTIONS}
          value={cfg.barDirection}
          onChange={(id) => update({ barDirection: id })}
          cols={3}
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

export default PolygonPanel
