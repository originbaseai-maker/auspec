import { useLayerStore } from '@/store/useLayerStore'
import type { BloomConfig } from '@/types/layer'
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
      </PanelGroup>

      <PanelGroup title="Echo">
        <SliderRow
          label="Count"
          hint={`${cfg.echoCount}`}
          value={cfg.echoCount}
          min={1}
          max={10}
          step={1}
          onChange={(v) => update({ echoCount: Math.round(v) })}
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
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Closed shape</span>
          <Toggle
            checked={cfg.closedShape}
            onChange={(v) => update({ closedShape: v })}
            ariaLabel="Closed shape"
          />
        </div>
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
