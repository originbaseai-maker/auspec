import { useLayerStore } from '@/store/useLayerStore'
import type {
  HaloFlameDirection,
  HaloFrameShape,
  HaloLayerConfig,
  HaloStyle,
} from '@/types/layer'
import { Image as ImageIcon } from 'lucide-react'
import {
  CenterSliderRow,
  LockedLayerBanner,
  PaletteEditor,
  PanelGroup,
  SegmentedGroup,
  SliderRow,
  Toggle,
} from './shared'

interface Props {
  layerId: string
}

const STYLES: ReadonlyArray<{ id: HaloStyle; label: string }> = [
  { id: 'radialBurst', label: 'Burst' },
  { id: 'spectrumCrown', label: 'Crown' },
  { id: 'pulseFrame', label: 'Frame' },
  { id: 'flame', label: 'Flame' },
  { id: 'orbit', label: 'Orbit' },
]

const FRAME_SHAPES: ReadonlyArray<{ id: HaloFrameShape; label: string }> = [
  { id: 'circle', label: 'Circle' },
  { id: 'roundedRect', label: 'Rounded' },
  { id: 'square', label: 'Square' },
]

const FLAME_DIRECTIONS: ReadonlyArray<{
  id: HaloFlameDirection
  label: string
}> = [
  { id: 'all', label: 'All' },
  { id: 'up', label: 'Up' },
]

function styleHint(style: HaloStyle): string {
  switch (style) {
    case 'radialBurst':
      return 'Rays burst from centre on every band'
    case 'spectrumCrown':
      return 'Classic spectrum bars fanned around the centre'
    case 'pulseFrame':
      return 'A single closed shape that pulses on bass'
    case 'flame':
      return 'Flickering tongues with additive heat'
    case 'orbit':
      return 'Particles orbit on the base ring'
  }
}

export function HaloPanel({ layerId }: Props) {
  // Read draft OR committed — Halo is editable while in draft mode.
  const layer = useLayerStore((s) => {
    if (
      s.draftLayer &&
      s.draftLayer.id === layerId &&
      s.draftLayer.type === 'halo'
    ) {
      return s.draftLayer
    }
    return s.layers.find((l) => l.id === layerId && l.type === 'halo')
  })
  const updateConfig = useLayerStore((s) => s.updateConfig)
  // Logo lookup — drives the "Add a Logo" prompt when no logo exists
  // and lockToLogo is true.
  const hasLogoLayer = useLayerStore((s) =>
    s.layers.some((l) => l.type === 'logo'),
  )
  const addLayerImmediate = useLayerStore((s) => s.addLayerImmediate)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a halo layer in the sidebar.
      </div>
    )
  }

  const cfg = layer.config as HaloLayerConfig
  const isLocked = layer.locked
  const update = (partial: Partial<HaloLayerConfig>) =>
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
        <SegmentedGroup
          options={STYLES}
          value={cfg.style}
          onChange={(v) => update({ style: v })}
          cols={3}
        />
        <p className="mt-1 text-[9px] text-white/30">{styleHint(cfg.style)}</p>
      </PanelGroup>

      <PanelGroup title="Logo Link">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/70">Lock to Logo</span>
          <Toggle
            checked={cfg.lockToLogo}
            onChange={(v) => update({ lockToLogo: v })}
            ariaLabel="Lock halo position to the Logo layer"
          />
        </div>
        <p className="mt-1 text-[9px] text-white/30">
          Center halo on the Logo layer. Dragging the Logo on canvas
          drags the Halo with it.
        </p>
        {cfg.lockToLogo && !hasLogoLayer && (
          <div
            className="mt-2 flex items-center justify-between rounded-md border px-3 py-2"
            style={{
              borderColor: 'rgba(168,85,247,0.35)',
              background: 'rgba(168,85,247,0.05)',
            }}
          >
            <span className="text-[11px] text-white/70">
              💡 Add a Logo to make this Halo centre around it
            </span>
            <button
              type="button"
              onClick={() => addLayerImmediate('logo')}
              className="ml-2 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-white"
              style={{
                background:
                  'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)',
              }}
              aria-label="Add Logo layer"
            >
              <ImageIcon className="h-3 w-3" aria-hidden="true" />
              Add Logo
            </button>
          </div>
        )}
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
          min={40}
          max={400}
          step={1}
          onChange={(v) => update({ baseRadius: v })}
          ariaLabel="Base radius"
        />
      </PanelGroup>

      <PanelGroup title="Audio Reactivity">
        <CenterSliderRow
          label="🔉 Bass"
          hint={`${Math.round(cfg.bassSensitivity * 100)}%`}
          value={cfg.bassSensitivity * 100}
          min={0}
          max={200}
          step={5}
          center={100}
          onChange={(v) => update({ bassSensitivity: v / 100 })}
          ariaLabel="Bass sensitivity"
        />
        <CenterSliderRow
          label="🔊 Mid"
          hint={`${Math.round(cfg.midSensitivity * 100)}%`}
          value={cfg.midSensitivity * 100}
          min={0}
          max={200}
          step={5}
          center={100}
          onChange={(v) => update({ midSensitivity: v / 100 })}
          ariaLabel="Mid sensitivity"
        />
        <CenterSliderRow
          label="📢 Treble"
          hint={`${Math.round(cfg.trebleSensitivity * 100)}%`}
          value={cfg.trebleSensitivity * 100}
          min={0}
          max={200}
          step={5}
          center={100}
          onChange={(v) => update({ trebleSensitivity: v / 100 })}
          ariaLabel="Treble sensitivity"
        />
      </PanelGroup>

      {/* Style-specific options — only the matching style shows */}
      {cfg.style === 'radialBurst' && (
        <PanelGroup title="Radial Burst">
          <SliderRow
            label="Ray count"
            hint={`${cfg.rayCount ?? 24}`}
            value={cfg.rayCount ?? 24}
            min={12}
            max={48}
            step={1}
            onChange={(v) => update({ rayCount: Math.round(v) })}
            ariaLabel="Ray count"
          />
        </PanelGroup>
      )}

      {cfg.style === 'spectrumCrown' && (
        <PanelGroup title="Spectrum Crown">
          <SliderRow
            label="Bar count"
            hint={`${cfg.barCount ?? 64}`}
            value={cfg.barCount ?? 64}
            min={32}
            max={128}
            step={1}
            onChange={(v) => update({ barCount: Math.round(v) })}
            ariaLabel="Bar count"
          />
        </PanelGroup>
      )}

      {cfg.style === 'pulseFrame' && (
        <PanelGroup title="Pulse Frame">
          <SliderRow
            label="Thickness"
            hint={`${cfg.frameThickness ?? 8}px`}
            value={cfg.frameThickness ?? 8}
            min={2}
            max={30}
            step={1}
            onChange={(v) => update({ frameThickness: Math.round(v) })}
            ariaLabel="Frame thickness"
          />
          <div className="mt-2">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Shape
            </p>
            <SegmentedGroup
              options={FRAME_SHAPES}
              value={cfg.frameShape ?? 'circle'}
              onChange={(v) => update({ frameShape: v })}
              cols={3}
            />
          </div>
        </PanelGroup>
      )}

      {cfg.style === 'flame' && (
        <PanelGroup title="Flame">
          <SliderRow
            label="Flame count"
            hint={`${cfg.flameCount ?? 12}`}
            value={cfg.flameCount ?? 12}
            min={6}
            max={24}
            step={1}
            onChange={(v) => update({ flameCount: Math.round(v) })}
            ariaLabel="Flame count"
          />
          <div className="mt-2">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Direction
            </p>
            <SegmentedGroup
              options={FLAME_DIRECTIONS}
              value={cfg.flameDirection ?? 'all'}
              onChange={(v) => update({ flameDirection: v })}
              cols={2}
            />
          </div>
        </PanelGroup>
      )}

      {cfg.style === 'orbit' && (
        <PanelGroup title="Orbit">
          <SliderRow
            label="Orbit count"
            hint={`${cfg.orbitCount ?? 16}`}
            value={cfg.orbitCount ?? 16}
            min={6}
            max={30}
            step={1}
            onChange={(v) => update({ orbitCount: Math.round(v) })}
            ariaLabel="Orbit count"
          />
          <CenterSliderRow
            label="Speed"
            hint={`${(cfg.orbitSpeed ?? 0.4).toFixed(2)} r/s`}
            value={cfg.orbitSpeed ?? 0.4}
            min={-2}
            max={2}
            step={0.05}
            center={0}
            onChange={(v) => update({ orbitSpeed: v })}
            ariaLabel="Orbit speed"
          />
        </PanelGroup>
      )}

      <PanelGroup title="Position">
        {/* Disabled when locked to Logo — visual feedback that the
            position is being read from the Logo layer instead. */}
        <div style={{ opacity: cfg.lockToLogo ? 0.4 : 1, pointerEvents: cfg.lockToLogo ? 'none' : 'auto' }}>
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
        </div>
        {cfg.lockToLogo && (
          <p className="mt-1 text-[9px] text-white/30">
            Position read from the Logo layer. Turn off Lock to Logo
            to edit directly.
          </p>
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
      </PanelGroup>
    </div>
  )
}

export default HaloPanel
