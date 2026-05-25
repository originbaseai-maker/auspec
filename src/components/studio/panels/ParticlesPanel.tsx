import {
  DEFAULT_PARTICLE_CONFIG,
  type ParticleConfig,
  type ParticleMotion,
  type ParticleShape,
} from '@/store/useParticleStore'
import { useLayerStore } from '@/store/useLayerStore'
import {
  LockedLayerBanner,
  PaletteEditor,
  PanelGroup,
  SegmentedGroup,
  SliderRow,
  Toggle,
} from './shared'

const SHAPES: { id: ParticleShape; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'square', label: 'Square' },
  { id: 'star', label: 'Star' },
  { id: 'spark', label: 'Spark' },
  { id: 'ring', label: 'Ring' },
]

const MOTIONS: { id: ParticleMotion; label: string }[] = [
  { id: 'float', label: 'Float' },
  { id: 'rise', label: 'Rise' },
  { id: 'fall', label: 'Fall' },
  { id: 'explode', label: 'Explode' },
  { id: 'orbit', label: 'Orbit' },
]

interface Props {
  layerId: string
}

export function ParticlesPanel({ layerId }: Props) {
  const layer = useLayerStore((s) =>
    s.layers.find((l) => l.id === layerId && l.type === 'particles'),
  )
  const updateConfig = useLayerStore((s) => s.updateConfig)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a layer in the Layers sidebar.
      </div>
    )
  }

  const cfg = layer.config as ParticleConfig
  const isLocked = layer.locked

  // Build a shim that matches the legacy `store` API the JSX expects —
  // getters proxy to cfg, setters call updateConfig. Lets the panel body
  // stay unchanged while the data flows through the layer store.
  const update = (partial: Partial<ParticleConfig>) =>
    updateConfig(layerId, partial)
  const store = {
    ...cfg,
    setEnabled: (v: boolean) => update({ enabled: v }),
    setShape: (v: ParticleShape) => update({ shape: v }),
    setMotion: (v: ParticleMotion) => update({ motion: v }),
    setDensity: (v: number) =>
      update({ density: Math.max(10, Math.min(500, Math.round(v))) }),
    setSize: (v: number) =>
      update({ size: Math.max(1, Math.min(20, v)) }),
    setSpeed: (v: number) =>
      update({ speed: Math.max(0.1, Math.min(3, v)) }),
    setLifespan: (v: number) =>
      update({ lifespan: Math.max(0.5, Math.min(5, v)) }),
    setFadeOut: (v: boolean) => update({ fadeOut: v }),
    setGlowEnabled: (v: boolean) => update({ glowEnabled: v }),
    setGlowIntensity: (v: number) =>
      update({ glowIntensity: Math.max(0, Math.min(100, v)) }),
    setPalette: (v: string[]) =>
      update({ palette: v.length >= 1 ? v : ['#ffffff'] }),
    setUseVisualizerPalette: (v: boolean) =>
      update({ useVisualizerPalette: v }),
    setBeatReactive: (v: boolean) => update({ beatReactive: v }),
    setBeatBurstAmount: (v: number) =>
      update({
        beatBurstAmount: Math.max(0, Math.min(100, Math.round(v))),
      }),
    setBeatSizeMultiplier: (v: number) =>
      update({ beatSizeMultiplier: Math.max(1, Math.min(3, v)) }),
    setGravity: (v: number) =>
      update({ gravity: Math.max(-1, Math.min(1, v)) }),
    setFriction: (v: number) =>
      update({ friction: Math.max(0.85, Math.min(1, v)) }),
    setSpread: (v: number) =>
      update({ spread: Math.max(0, Math.min(100, v)) }),
    resetToDefaults: () => update({ ...DEFAULT_PARTICLE_CONFIG }),
  }

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
      <PanelGroup title="Particles">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/70">Enabled</span>
          <Toggle
            checked={store.enabled}
            onChange={store.setEnabled}
            ariaLabel="Enable particles"
          />
        </div>
      </PanelGroup>

      <div
        style={{
          opacity: store.enabled ? 1 : 0.4,
          pointerEvents: store.enabled ? 'auto' : 'none',
        }}
        className="space-y-5"
      >
        <PanelGroup title="Shape">
          <SegmentedGroup
            options={SHAPES}
            value={store.shape}
            onChange={store.setShape}
            cols={3}
          />
        </PanelGroup>

        <PanelGroup title="Motion">
          <SegmentedGroup
            options={MOTIONS}
            value={store.motion}
            onChange={store.setMotion}
            cols={3}
          />
        </PanelGroup>

        <SliderRow
          label="Density"
          hint={`${store.density}`}
          value={store.density}
          min={10}
          max={500}
          step={5}
          onChange={store.setDensity}
          ariaLabel="Density"
        />

        <SliderRow
          label="Size"
          hint={`${store.size}px`}
          value={store.size}
          min={1}
          max={20}
          step={0.5}
          onChange={store.setSize}
          ariaLabel="Size"
        />

        <SliderRow
          label="Speed"
          hint={`${store.speed.toFixed(1)}x`}
          value={store.speed}
          min={0.1}
          max={3}
          step={0.1}
          onChange={store.setSpeed}
          ariaLabel="Speed"
        />

        <SliderRow
          label="Lifespan"
          hint={`${store.lifespan.toFixed(1)}s`}
          value={store.lifespan}
          min={0.5}
          max={5}
          step={0.1}
          onChange={store.setLifespan}
          ariaLabel="Lifespan"
        />

        <PanelGroup title="Fade out">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/70">
              Particles fade as they age
            </span>
            <Toggle
              checked={store.fadeOut}
              onChange={store.setFadeOut}
              ariaLabel="Fade out"
            />
          </div>
        </PanelGroup>

        <PanelGroup title="Colors">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">
              Sync with visualizer
            </span>
            <Toggle
              checked={store.useVisualizerPalette}
              onChange={store.setUseVisualizerPalette}
              ariaLabel="Sync palette"
            />
          </div>
          <div
            style={{
              opacity: store.useVisualizerPalette ? 0.4 : 1,
              pointerEvents: store.useVisualizerPalette ? 'none' : 'auto',
            }}
          >
            <PaletteEditor
              palette={store.palette}
              onChange={(p) => store.setPalette(p ?? store.palette)}
              fallbackStart={store.palette[0] ?? '#3b82f6'}
              fallbackEnd={
                store.palette[store.palette.length - 1] ?? '#8b5cf6'
              }
            />
          </div>
        </PanelGroup>

        <PanelGroup title="Glow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">Enabled</span>
            <Toggle
              checked={store.glowEnabled}
              onChange={store.setGlowEnabled}
              ariaLabel="Glow"
            />
          </div>
          <div style={{ opacity: store.glowEnabled ? 1 : 0.4 }}>
            <SliderRow
              label="Intensity"
              hint={`${Math.round(store.glowIntensity)}%`}
              value={store.glowIntensity}
              min={0}
              max={100}
              step={1}
              onChange={store.setGlowIntensity}
              ariaLabel="Glow intensity"
            />
          </div>
        </PanelGroup>

        <PanelGroup title="💓 Beat Reactivity">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">React to beat</span>
            <Toggle
              checked={store.beatReactive}
              onChange={store.setBeatReactive}
              ariaLabel="Beat reactive"
            />
          </div>
          <div
            style={{ opacity: store.beatReactive ? 1 : 0.4 }}
            className="space-y-2"
          >
            <SliderRow
              label="Burst on beat"
              hint={`+${store.beatBurstAmount}`}
              value={store.beatBurstAmount}
              min={0}
              max={100}
              step={5}
              onChange={store.setBeatBurstAmount}
              ariaLabel="Burst amount"
            />
            <SliderRow
              label="Size pulse"
              hint={`${store.beatSizeMultiplier.toFixed(1)}x`}
              value={store.beatSizeMultiplier}
              min={1}
              max={3}
              step={0.1}
              onChange={store.setBeatSizeMultiplier}
              ariaLabel="Size multiplier"
            />
          </div>
        </PanelGroup>

        <PanelGroup title="Physics">
          <SliderRow
            label="Gravity"
            hint={
              store.gravity === 0
                ? 'None'
                : store.gravity > 0
                  ? `↓ ${store.gravity.toFixed(2)}`
                  : `↑ ${Math.abs(store.gravity).toFixed(2)}`
            }
            value={store.gravity}
            min={-1}
            max={1}
            step={0.05}
            onChange={store.setGravity}
            ariaLabel="Gravity"
          />
          <SliderRow
            label="Friction"
            hint={store.friction.toFixed(2)}
            value={store.friction}
            min={0.85}
            max={1}
            step={0.01}
            onChange={store.setFriction}
            ariaLabel="Friction"
          />
          <SliderRow
            label="Spread"
            hint={`${store.spread}%`}
            value={store.spread}
            min={0}
            max={100}
            step={1}
            onChange={store.setSpread}
            ariaLabel="Spread"
          />
        </PanelGroup>
      </div>

      </div>
      <button
        type="button"
        onClick={store.resetToDefaults}
        className="w-full rounded-md border px-2 py-1.5 text-[10px] text-white/50 hover:text-white/80"
        style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
      >
        ↻ Reset to defaults
      </button>
    </div>
  )
}

export default ParticlesPanel
