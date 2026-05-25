import type { FrameConfig } from '@/store/useFrameStore'
import { useLayerStore } from '@/store/useLayerStore'
import {
  ColorRow,
  LockedLayerBanner,
  PanelGroup,
  Slider,
  SliderRow,
  Toggle,
} from './shared'

interface Props {
  layerId: string
}

export function FramePanel({ layerId }: Props) {
  const layer = useLayerStore((s) =>
    s.layers.find((l) => l.id === layerId && l.type === 'frame'),
  )
  const updateConfig = useLayerStore((s) => s.updateConfig)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a layer in the Layers sidebar.
      </div>
    )
  }

  const cfg = layer.config as FrameConfig
  const isLocked = layer.locked

  const update = (partial: Partial<FrameConfig>) =>
    updateConfig(layerId, partial)
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v))

  const enabled = cfg.enabled
  const color = cfg.color
  const thickness = cfg.thickness
  const smoothness = cfg.smoothness
  const haloEnabled = cfg.haloEnabled
  const haloIntensity = cfg.haloIntensity
  const shadowEnabled = cfg.shadowEnabled
  const shadowIntensity = cfg.shadowIntensity
  const shadowColor = cfg.shadowColor
  const reflectionEnabled = cfg.reflectionEnabled
  const reflectionIntensity = cfg.reflectionIntensity
  const pulseEnabled = cfg.pulseEnabled
  const pulseIntensity = cfg.pulseIntensity

  const setEnabled = (v: boolean) => update({ enabled: v })
  const setColor = (v: string) => update({ color: v })
  const setThickness = (v: number) => update({ thickness: clamp(v, 0, 40) })
  const setSmoothness = (v: number) => update({ smoothness: clamp(v, 0, 50) })
  const setHaloEnabled = (v: boolean) => update({ haloEnabled: v })
  const setHaloIntensity = (v: number) =>
    update({ haloIntensity: clamp(v, 0, 100) })
  const setShadowEnabled = (v: boolean) => update({ shadowEnabled: v })
  const setShadowIntensity = (v: number) =>
    update({ shadowIntensity: clamp(v, 0, 100) })
  const setShadowColor = (v: string) => update({ shadowColor: v })
  const setReflectionEnabled = (v: boolean) =>
    update({ reflectionEnabled: v })
  const setReflectionIntensity = (v: number) =>
    update({ reflectionIntensity: clamp(v, 0, 100) })
  const setPulseEnabled = (v: boolean) => update({ pulseEnabled: v })
  const setPulseIntensity = (v: number) =>
    update({ pulseIntensity: clamp(v, 0, 100) })

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
      <PanelGroup title="Frame">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/70">Enabled</span>
          <Toggle
            checked={enabled}
            onChange={setEnabled}
            ariaLabel="Enable frame"
          />
        </div>
      </PanelGroup>

      <div
        className="space-y-5"
        style={{
          opacity: enabled ? 1 : 0.4,
          pointerEvents: enabled ? 'auto' : 'none',
        }}
      >
        <PanelGroup title="Border Color">
          <ColorRow value={color} onChange={setColor} ariaLabel="border color" />
        </PanelGroup>

        <PanelGroup title="Thickness" hint={`${thickness}px`}>
          <Slider
            value={thickness}
            min={0}
            max={40}
            step={1}
            onChange={setThickness}
            ariaLabel="Thickness"
          />
        </PanelGroup>

        <PanelGroup title="Smoothness" hint={`${smoothness}px`}>
          <Slider
            value={smoothness}
            min={0}
            max={50}
            step={1}
            onChange={setSmoothness}
            ariaLabel="Border radius"
          />
          <p className="mt-1 text-[9px] text-white/30">Rounded corners</p>
        </PanelGroup>

        <PanelGroup title="✨ Halo">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">Color glow pulse</span>
            <Toggle
              checked={haloEnabled}
              onChange={setHaloEnabled}
              ariaLabel="Halo"
            />
          </div>
          <div style={{ opacity: haloEnabled ? 1 : 0.4 }}>
            <SliderRow
              label="Intensity"
              hint={`${Math.round(haloIntensity)}%`}
              value={haloIntensity}
              min={0}
              max={100}
              step={1}
              onChange={setHaloIntensity}
              ariaLabel="Halo intensity"
            />
          </div>
        </PanelGroup>

        <PanelGroup title="Shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">Drop shadow</span>
            <Toggle
              checked={shadowEnabled}
              onChange={setShadowEnabled}
              ariaLabel="Shadow"
            />
          </div>
          <div
            style={{ opacity: shadowEnabled ? 1 : 0.4 }}
            className="space-y-2"
          >
            <SliderRow
              label="Intensity"
              hint={`${Math.round(shadowIntensity)}%`}
              value={shadowIntensity}
              min={0}
              max={100}
              step={1}
              onChange={setShadowIntensity}
              ariaLabel="Shadow intensity"
            />
            <div>
              <p className="mb-1 text-[11px] text-white/70">Color</p>
              <ColorRow
                value={shadowColor}
                onChange={setShadowColor}
                ariaLabel="shadow color"
              />
            </div>
          </div>
        </PanelGroup>

        <PanelGroup title="Reflection">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">Glossy overlay</span>
            <Toggle
              checked={reflectionEnabled}
              onChange={setReflectionEnabled}
              ariaLabel="Reflection"
            />
          </div>
          <div style={{ opacity: reflectionEnabled ? 1 : 0.4 }}>
            <SliderRow
              label="Intensity"
              hint={`${Math.round(reflectionIntensity)}%`}
              value={reflectionIntensity}
              min={0}
              max={100}
              step={1}
              onChange={setReflectionIntensity}
              ariaLabel="Reflection intensity"
            />
          </div>
        </PanelGroup>

        <PanelGroup title="💓 Pulse">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-white/70">
              Beat-reactive thickness
            </span>
            <Toggle
              checked={pulseEnabled}
              onChange={setPulseEnabled}
              ariaLabel="Pulse"
            />
          </div>
          <div style={{ opacity: pulseEnabled ? 1 : 0.4 }}>
            <SliderRow
              label="Intensity"
              hint={`${Math.round(pulseIntensity)}%`}
              value={pulseIntensity}
              min={0}
              max={100}
              step={1}
              onChange={setPulseIntensity}
              ariaLabel="Pulse intensity"
            />
          </div>
        </PanelGroup>
      </div>
      </div>
    </div>
  )
}

export default FramePanel
