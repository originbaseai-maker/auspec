import { useLayerStore } from '@/store/useLayerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import type { CircularSpectrumConfig } from '@/lib/renderers/circularSpectrum'
import {
  CenterSliderRow,
  FreqRangeBlock,
  LockedLayerBanner,
  LogoFillPicker,
  PaletteEditor,
  PanelGroup,
  SegmentedGroup,
  SensitivityBlock,
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

const SYNC_MODES = [
  { id: 'loop' as const, label: 'Loop' },
  { id: 'music_sync' as const, label: 'Sync to Music' },
]

const FIT_MODES = [
  { id: 'cover' as const, label: 'Cover' },
  { id: 'contain' as const, label: 'Contain' },
  { id: 'fill' as const, label: 'Fill' },
]

type Patch = Partial<CircularSpectrumConfig> & {
  hueInterpolation?: number
  startFrequency?: number
  endFrequency?: number
  sideMode?: SideMode
}

interface Props {
  layerId: string
}

export function CircularPanel({ layerId }: Props) {
  const layer = useLayerStore((s) =>
    s.layers.find((l) => l.id === layerId && l.type === 'circular'),
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

  const cfg = layer.config as CircularSpectrumConfig
  const isLocked = layer.locked
  const update: (p: Patch) => void = (p) => updateConfig(layerId, p)

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
        <CenterSliderRow
          label="X"
          hint={`${Math.round((cfg.offsetX ?? 0.5) * 100)}%`}
          value={(cfg.offsetX ?? 0.5) * 100}
          min={0}
          max={100}
          step={1}
          center={50}
          onChange={(v) => update({ offsetX: v / 100 })}
          ariaLabel="Horizontal position"
        />
        <CenterSliderRow
          label="Y"
          hint={`${Math.round((cfg.offsetY ?? 0.5) * 100)}%`}
          value={(cfg.offsetY ?? 0.5) * 100}
          min={0}
          max={100}
          step={1}
          center={50}
          onChange={(v) => update({ offsetY: v / 100 })}
          ariaLabel="Vertical position"
        />
        <p className="text-[9px] text-white/30">
          Or drag the element directly on the canvas
        </p>
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

      <PanelGroup title="Inner Fill">
        {/* Mutually-exclusive Video / Image fill selector. The
            existing 'none' state is the default (bars-only); a
            Video and an Image fill can't be on at the same time —
            picking one disables the other so the renderer's
            priority rule never has to break a tie. */}
        <div className="mb-2">
          <SegmentedGroup
            options={[
              { id: 'none' as const, label: 'None' },
              { id: 'video' as const, label: 'Video' },
              { id: 'image' as const, label: 'Image' },
            ]}
            value={
              cfg.videoFillEnabled
                ? 'video'
                : cfg.imageFillEnabled
                  ? 'image'
                  : 'none'
            }
            onChange={(v) =>
              update({
                videoFillEnabled: v === 'video',
                imageFillEnabled: v === 'image',
              })
            }
            cols={3}
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
                  aria-label="Circular video fill source"
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
        {cfg.imageFillEnabled && (
          <div className="space-y-2">
            {/* Logo-layer picker takes precedence: when the user has
                an image they already uploaded as a Logo, this is
                the path that opens up the bidirectional connection
                (LogoPanel shows where it's used). Bare image upload
                stays as the simpler-onboarding fallback. */}
            <LogoFillPicker
              value={cfg.imageFillLogoLayerId ?? null}
              onChange={(id) =>
                update({
                  imageFillLogoLayerId: id,
                  // Clear inline src when a Logo is picked — the
                  // renderer prefers the Logo reference anyway,
                  // and clearing prevents stale data hanging on.
                  imageFillSrc: id ? null : (cfg.imageFillSrc ?? null),
                })
              }
            />
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              Fit
            </p>
            <SegmentedGroup
              options={FIT_MODES}
              value={cfg.imageFillFit ?? 'cover'}
              onChange={(v) => update({ imageFillFit: v })}
              cols={3}
            />
          </div>
        )}
      </PanelGroup>
      </div>
    </div>
  )
}

export default CircularPanel
