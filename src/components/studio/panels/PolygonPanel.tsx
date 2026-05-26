import { useLayerStore } from '@/store/useLayerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import type {
  PolygonShape,
  PolygonSpectrumConfig,
} from '@/lib/renderers/polygonSpectrum'
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

const POLYGON_SHAPES: { id: PolygonShape; glyph: string }[] = [
  { id: 'triangle', glyph: '△' },
  { id: 'square', glyph: '□' },
  { id: 'pentagon', glyph: '⬠' },
  { id: 'hexagon', glyph: '⬡' },
  { id: 'star', glyph: '✦' },
  { id: 'diamond', glyph: '◇' },
]

const SYNC_MODES = [
  { id: 'loop' as const, label: 'Loop' },
  { id: 'music_sync' as const, label: 'Sync to Music' },
]

const FIT_MODES = [
  { id: 'cover' as const, label: 'Cover' },
  { id: 'contain' as const, label: 'Contain' },
  { id: 'fill' as const, label: 'Fill' },
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

interface Props {
  layerId: string
}

export function PolygonPanel({ layerId }: Props) {
  const layer = useLayerStore((s) =>
    s.layers.find((l) => l.id === layerId && l.type === 'polygon'),
  )
  const updateConfig = useLayerStore((s) => s.updateConfig)
  const videoAssets = useVideoAssetStore((s) => s.assets)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a layer in the Layers sidebar.
      </div>
    )
  }

  const cfg = layer.config as PolygonSpectrumConfig
  const isLocked = layer.locked
  const update: (p: Patch) => void = (p) => updateConfig(layerId, p)

  const ext = cfg as PolygonSpectrumConfig & {
    hueInterpolation?: number
    startFrequency?: number
    endFrequency?: number
  }
  const hueInterpolation = ext.hueInterpolation ?? 0
  const startFrequency = ext.startFrequency ?? 20
  const endFrequency = ext.endFrequency ?? 20000

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

      <PanelGroup title="Position">
        <SliderRow
          label="X"
          hint={`${Math.round((cfg.offsetX ?? 0.5) * 100)}%`}
          value={(cfg.offsetX ?? 0.5) * 100}
          min={0}
          max={100}
          step={1}
          onChange={(v) => update({ offsetX: v / 100 })}
          ariaLabel="Horizontal position"
        />
        <SliderRow
          label="Y"
          hint={`${Math.round((cfg.offsetY ?? 0.5) * 100)}%`}
          value={(cfg.offsetY ?? 0.5) * 100}
          min={0}
          max={100}
          step={1}
          onChange={(v) => update({ offsetY: v / 100 })}
          ariaLabel="Vertical position"
        />
        <p className="text-[9px] text-white/30">
          Or drag the element directly on the canvas
        </p>
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

      <PanelGroup title="Video Fill">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Enabled</span>
          <Toggle
            checked={!!cfg.videoFillEnabled}
            onChange={(v) => update({ videoFillEnabled: v })}
            ariaLabel="Video fill enabled"
          />
        </div>
        {cfg.videoFillEnabled && (
          <div className="space-y-2">
            {videoAssets.length === 0 ? (
              <p
                className="rounded-md border px-3 py-2 text-[11px] text-white/60"
                style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}
              >
                No videos uploaded yet. Open the Videos modal (Film icon
                in the top bar) to add one.
              </p>
            ) : (
              <>
                <select
                  value={cfg.videoFillAssetId ?? ''}
                  onChange={(e) =>
                    update({ videoFillAssetId: e.target.value || null })
                  }
                  className="w-full rounded border bg-[#0f0f0f] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#3b82f6]"
                  style={{ borderColor: '#2a2a2a' }}
                  aria-label="Polygon video fill source"
                >
                  <option value="">— Connect to video —</option>
                  {videoAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <SegmentedGroup
                  options={SYNC_MODES}
                  value={cfg.videoFillSyncMode ?? 'loop'}
                  onChange={(v) => update({ videoFillSyncMode: v })}
                  cols={2}
                />
                <p className="text-[10px] uppercase tracking-wider text-white/40">
                  Fit
                </p>
                <SegmentedGroup
                  options={FIT_MODES}
                  value={cfg.videoFillFit ?? 'cover'}
                  onChange={(v) => update({ videoFillFit: v })}
                  cols={3}
                />
              </>
            )}
          </div>
        )}
      </PanelGroup>
      </div>
    </div>
  )
}

export default PolygonPanel
