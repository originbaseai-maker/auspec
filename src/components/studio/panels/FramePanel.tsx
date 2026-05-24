import { useFrameStore } from '@/store/useFrameStore'
import {
  ColorRow,
  PanelGroup,
  Slider,
  SliderRow,
  Toggle,
} from './shared'

export function FramePanel() {
  const enabled = useFrameStore((s) => s.enabled)
  const color = useFrameStore((s) => s.color)
  const thickness = useFrameStore((s) => s.thickness)
  const smoothness = useFrameStore((s) => s.smoothness)
  const haloEnabled = useFrameStore((s) => s.haloEnabled)
  const haloIntensity = useFrameStore((s) => s.haloIntensity)
  const shadowEnabled = useFrameStore((s) => s.shadowEnabled)
  const shadowIntensity = useFrameStore((s) => s.shadowIntensity)
  const shadowColor = useFrameStore((s) => s.shadowColor)
  const reflectionEnabled = useFrameStore((s) => s.reflectionEnabled)
  const reflectionIntensity = useFrameStore((s) => s.reflectionIntensity)
  const pulseEnabled = useFrameStore((s) => s.pulseEnabled)
  const pulseIntensity = useFrameStore((s) => s.pulseIntensity)

  const setEnabled = useFrameStore((s) => s.setEnabled)
  const setColor = useFrameStore((s) => s.setColor)
  const setThickness = useFrameStore((s) => s.setThickness)
  const setSmoothness = useFrameStore((s) => s.setSmoothness)
  const setHaloEnabled = useFrameStore((s) => s.setHaloEnabled)
  const setHaloIntensity = useFrameStore((s) => s.setHaloIntensity)
  const setShadowEnabled = useFrameStore((s) => s.setShadowEnabled)
  const setShadowIntensity = useFrameStore((s) => s.setShadowIntensity)
  const setShadowColor = useFrameStore((s) => s.setShadowColor)
  const setReflectionEnabled = useFrameStore((s) => s.setReflectionEnabled)
  const setReflectionIntensity = useFrameStore((s) => s.setReflectionIntensity)
  const setPulseEnabled = useFrameStore((s) => s.setPulseEnabled)
  const setPulseIntensity = useFrameStore((s) => s.setPulseIntensity)

  return (
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
  )
}

export default FramePanel
