import { useLayerStore } from '@/store/useLayerStore'
import type { BloomConfig, BloomStyle } from '@/types/layer'
import {
  CenterSliderRow,
  LockedLayerBanner,
  PaletteEditor,
  PanelGroup,
  SegmentedGroup,
  SensitivityBlock,
  Slider,
  SliderRow,
  Toggle,
} from './shared'

interface Props {
  layerId: string
}

const ECHO_MODES = [
  { id: 'outward' as const, label: 'Outward' },
  { id: 'inward' as const, label: 'Inward' },
]

const STYLES: ReadonlyArray<{ id: BloomStyle; label: string }> = [
  { id: 'classic', label: 'Classic' },
  { id: 'organic', label: 'Organic' },
  { id: 'aura', label: 'Aura' },
  { id: 'echo', label: 'Echo' },
  { id: 'star', label: 'Star' },
  { id: 'multiRing', label: 'Rings' },
]

const ECHO_SHAPES = [
  { id: 'circle' as const, label: 'Circle' },
  { id: 'polygon' as const, label: 'Polygon' },
]

function styleHint(style: BloomStyle): string {
  switch (style) {
    case 'classic':
      return 'Radial spectrum with concentric echo rings'
    case 'organic':
      return 'Soft breathing blob, radial gradient fill'
    case 'aura':
      return 'Diffuse cloud of overlapping translucent circles'
    case 'echo':
      return 'Mirrored copies expanding outward (vertical mirror)'
    case 'star':
      return 'Rotating polygon star, spikes ride frequency bins'
    case 'multiRing':
      return 'Concentric rings, each on its own band'
  }
}

/**
 * Recommended echoCount per variant. Tuned so the variant looks
 * coherent out of the box — classic stays at its legacy default of
 * 4, organic needs few echoes (its breathing blob is already busy),
 * aura barely needs any (it self-layers), star looks great with a
 * handful of rotated copies. echo and multiRing aren't wrapped, so
 * their entries here are vestigial.
 */
const RECOMMENDED_ECHO_COUNT: Record<BloomStyle, number> = {
  classic: 4,
  organic: 3,
  aura: 2,
  echo: 1,
  star: 4,
  multiRing: 1,
}

export function BloomPanel({ layerId }: Props) {
  const layer = useLayerStore((s) =>
    s.layers.find((l) => l.id === layerId && l.type === 'bloom'),
  )
  const updateConfig = useLayerStore((s) => s.updateConfig)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a layer in the Layers sidebar.
      </div>
    )
  }

  const cfg = layer.config as BloomConfig
  const isLocked = layer.locked
  const update = (partial: Partial<BloomConfig>) =>
    updateConfig(layerId, partial)

  return (
    <div
      className="space-y-5"
      style={{
        opacity: isLocked ? 0.5 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
      }}
    >
      {isLocked && <LockedLayerBanner />}

      <PanelGroup title="Style">
        {/* 6 options at cols=3 = a 2-row segmented grid. Keeps each
            chip wide enough to read; dropdown would feel heavier in
            this narrow panel. */}
        <SegmentedGroup
          options={STYLES}
          value={cfg.style ?? 'classic'}
          onChange={(v) => {
            // Smart default: if the user hasn't manually tuned
            // echoCount for the variant they're switching INTO,
            // seed it with that variant's recommended value. Avoids
            // carrying over a busy "10" from classic into organic.
            const touched = cfg.echoCountTouchedFor ?? []
            const hasTouched = touched.includes(v)
            const patch: Partial<BloomConfig> = { style: v }
            if (!hasTouched) {
              patch.echoCount = RECOMMENDED_ECHO_COUNT[v]
            }
            update(patch)
          }}
          cols={3}
        />
        <p className="mt-1 text-[9px] text-white/30">
          {styleHint(cfg.style ?? 'classic')}
        </p>
      </PanelGroup>

      <PanelGroup title="Colors">
        <PaletteEditor
          palette={cfg.palette}
          onChange={(palette) => update({ palette })}
          fallbackStart={cfg.colorStart}
          fallbackEnd={cfg.colorEnd}
        />
      </PanelGroup>

      <PanelGroup title="Shape">
        <SliderRow
          label="Base radius"
          hint={`${Math.round(cfg.baseRadius)}px`}
          value={cfg.baseRadius}
          min={20}
          max={300}
          step={1}
          onChange={(v) => update({ baseRadius: v })}
          ariaLabel="Base radius"
        />
        <SliderRow
          label="Amplitude"
          hint={cfg.amplitudeScale.toFixed(2)}
          value={cfg.amplitudeScale}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => update({ amplitudeScale: v })}
          ariaLabel="Amplitude scale"
        />
        {/* pointCount / smoothness only apply to classic — other
            variants own their own point counts internally. */}
        {(cfg.style ?? 'classic') === 'classic' && (
          <>
            <SliderRow
              label="Points"
              hint={`${cfg.pointCount}`}
              value={cfg.pointCount}
              min={32}
              max={256}
              step={1}
              onChange={(v) => update({ pointCount: Math.round(v) })}
              ariaLabel="Point count"
            />
            <SliderRow
              label="Smoothness"
              hint={cfg.smoothness.toFixed(2)}
              value={cfg.smoothness}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => update({ smoothness: v })}
              ariaLabel="Smoothness"
            />
            <p className="text-[9px] text-white/30">
              0 = polygon edges · 1 = organic curves
            </p>
          </>
        )}
      </PanelGroup>

      {/* ───── Variant-specific control groups ───── */}

      {(cfg.style ?? 'classic') === 'star' && (
        <PanelGroup title="Star">
          <SliderRow
            label="Points"
            hint={`${cfg.starPoints ?? 6}`}
            value={cfg.starPoints ?? 6}
            min={4}
            max={12}
            step={1}
            onChange={(v) => update({ starPoints: Math.round(v) })}
            ariaLabel="Star spike count"
          />
        </PanelGroup>
      )}

      {(cfg.style ?? 'classic') === 'echo' && (
        <PanelGroup title="Mirror Echo">
          <SliderRow
            label="Echo count"
            hint={`${cfg.mirrorEchoCount ?? 4}`}
            value={cfg.mirrorEchoCount ?? 4}
            min={2}
            max={6}
            step={1}
            onChange={(v) =>
              update({ mirrorEchoCount: Math.round(v) })
            }
            ariaLabel="Mirror echo count"
          />
          <div className="mt-2">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Base Shape
            </p>
            <SegmentedGroup
              options={ECHO_SHAPES}
              value={cfg.echoShape ?? 'circle'}
              onChange={(v) => update({ echoShape: v })}
              cols={2}
            />
          </div>
        </PanelGroup>
      )}

      {(cfg.style ?? 'classic') === 'multiRing' && (
        <PanelGroup title="Multi-Ring">
          <SliderRow
            label="Ring count"
            hint={`${cfg.ringCount ?? 5}`}
            value={cfg.ringCount ?? 5}
            min={3}
            max={7}
            step={1}
            onChange={(v) => update({ ringCount: Math.round(v) })}
            ariaLabel="Ring count"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">Rainbow</span>
            <Toggle
              checked={cfg.rainbow ?? false}
              onChange={(v) => update({ rainbow: v })}
              ariaLabel="Rainbow hue spread"
            />
          </div>
        </PanelGroup>
      )}

      {/* Variant-rotation control for star/echo/multiRing only.
          Classic uses its own legacy rotation block further below. */}
      {((cfg.style ?? 'classic') === 'star' ||
        (cfg.style ?? 'classic') === 'echo' ||
        (cfg.style ?? 'classic') === 'multiRing') && (
        <PanelGroup title="Variant Rotation">
          <CenterSliderRow
            label="Speed"
            hint={`${(cfg.variantRotationSpeed ?? 0.5).toFixed(2)} r/s`}
            value={cfg.variantRotationSpeed ?? 0.5}
            min={-2}
            max={2}
            step={0.05}
            center={0}
            onChange={(v) => update({ variantRotationSpeed: v })}
            ariaLabel="Variant rotation speed"
          />
        </PanelGroup>
      )}

      {/* Echo controls — available for every variant EXCEPT the two
          that already render multi-layer compositions internally
          ('echo' has its own mirror logic, 'multiRing' IS concentric
          rings by design — wrapping either would just multiply layers
          to noise). */}
      {(cfg.style ?? 'classic') !== 'echo' &&
        (cfg.style ?? 'classic') !== 'multiRing' && (
        <PanelGroup title="Echo">
          <SliderRow
            label="Count"
            hint={`${cfg.echoCount}`}
            value={cfg.echoCount}
            min={1}
            max={10}
            step={1}
            onChange={(v) => {
              // Mark this variant as "user has explicitly tuned
              // echoCount" so the style-switch smart default no
              // longer applies for it on subsequent switches.
              const style = cfg.style ?? 'classic'
              const touched = cfg.echoCountTouchedFor ?? []
              const next = touched.includes(style)
                ? touched
                : [...touched, style]
              update({
                echoCount: Math.round(v),
                echoCountTouchedFor: next,
              })
            }}
            ariaLabel="Echo count"
          />
          <SliderRow
            label="Spacing"
            hint={`${Math.round(cfg.echoSpacing)}px`}
            value={cfg.echoSpacing}
            min={0}
            max={80}
            step={1}
            onChange={(v) => update({ echoSpacing: v })}
            ariaLabel="Echo spacing"
          />
          <SliderRow
            label="Falloff"
            hint={cfg.echoFalloff.toFixed(2)}
            value={cfg.echoFalloff}
            min={0.2}
            max={1}
            step={0.01}
            onChange={(v) => update({ echoFalloff: v })}
            ariaLabel="Echo falloff"
          />
          <SliderRow
            label="Rotation offset"
            hint={`${Math.round(cfg.echoRotationOffset ?? 0)}°/step`}
            value={cfg.echoRotationOffset ?? 0}
            min={-30}
            max={30}
            step={1}
            onChange={(v) => update({ echoRotationOffset: v })}
            ariaLabel="Echo rotation offset"
          />
          <div className="mt-2">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Direction
            </p>
            <SegmentedGroup
              options={ECHO_MODES}
              value={cfg.echoMode}
              onChange={(v) => update({ echoMode: v })}
              cols={2}
            />
          </div>
        </PanelGroup>
      )}

      {(cfg.style ?? 'classic') === 'classic' && (
      <PanelGroup title="Rotation">
        <SliderRow
          label="Offset"
          hint={`${Math.round(cfg.rotation)}°`}
          value={cfg.rotation}
          min={0}
          max={360}
          step={1}
          onChange={(v) => update({ rotation: v })}
          ariaLabel="Rotation offset"
        />
        <SliderRow
          label="Speed"
          hint={
            cfg.rotationSpeed === 0
              ? 'Static'
              : `${cfg.rotationSpeed > 0 ? '↻' : '↺'} ${Math.abs(cfg.rotationSpeed).toFixed(0)}°/s`
          }
          value={cfg.rotationSpeed}
          min={-180}
          max={180}
          step={1}
          onChange={(v) => update({ rotationSpeed: v })}
          ariaLabel="Rotation speed"
        />
      </PanelGroup>
      )}

      <PanelGroup title="Position">
        <CenterSliderRow
          label="X"
          hint={`${Math.round(cfg.offsetX * 100)}%`}
          value={cfg.offsetX * 100}
          min={0}
          max={100}
          step={1}
          center={50}
          onChange={(v) => update({ offsetX: v / 100 })}
          ariaLabel="Horizontal position"
        />
        <CenterSliderRow
          label="Y"
          hint={`${Math.round(cfg.offsetY * 100)}%`}
          value={cfg.offsetY * 100}
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

      <PanelGroup title="Stroke">
        <SliderRow
          label="Line width"
          hint={`${cfg.lineWidth}px`}
          value={cfg.lineWidth}
          min={1}
          max={10}
          step={0.5}
          onChange={(v) => update({ lineWidth: v })}
          ariaLabel="Line width"
        />
        {/* Closed shape only matters for the classic radial-spectrum
            curve; the other variants either always close (organic,
            multiRing, echo) or don't have a path to close (aura, star
            close implicitly via closePath). */}
        {(cfg.style ?? 'classic') === 'classic' && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">Closed shape</span>
            <Toggle
              checked={cfg.closedShape}
              onChange={(v) => update({ closedShape: v })}
              ariaLabel="Closed shape"
            />
          </div>
        )}
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
        <div style={{ opacity: cfg.glowEnabled ? 1 : 0.4 }}>
          <SliderRow
            label="Intensity"
            hint={`${Math.round(cfg.glowIntensity)}%`}
            value={cfg.glowIntensity}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ glowIntensity: v })}
            ariaLabel="Glow intensity"
          />
        </div>
      </PanelGroup>

      <PanelGroup
        title="Bass Pulse"
        hint={`${Math.round(cfg.bassPulse * 100)}%`}
      >
        <Slider
          value={cfg.bassPulse}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update({ bassPulse: v })}
          ariaLabel="Bass pulse"
        />
        <p className="mt-1 text-[9px] text-white/30">
          Bass scales the whole shape on each beat
        </p>
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

      <PanelGroup title="Frequency Range">
        <SliderRow
          label="Start"
          hint={`${cfg.startFrequency}%`}
          value={cfg.startFrequency}
          min={0}
          max={99}
          step={1}
          onChange={(v) =>
            update({ startFrequency: Math.min(v, cfg.endFrequency - 1) })
          }
          ariaLabel="Frequency start"
        />
        <SliderRow
          label="End"
          hint={`${cfg.endFrequency}%`}
          value={cfg.endFrequency}
          min={1}
          max={100}
          step={1}
          onChange={(v) =>
            update({ endFrequency: Math.max(v, cfg.startFrequency + 1) })
          }
          ariaLabel="Frequency end"
        />
      </PanelGroup>
    </div>
  )
}

export default BloomPanel
