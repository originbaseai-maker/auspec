import { useLayerStore } from '@/store/useLayerStore'
import type { FontFamily, TextLayerConfig } from '@/types/layer'
import {
  ColorRow,
  LockedLayerBanner,
  PanelGroup,
  SliderRow,
  Toggle,
} from './shared'

const FONTS: FontFamily[] = [
  'Inter',
  'Bebas Neue',
  'Playfair Display',
  'Pacifico',
  'Space Mono',
]

const POSITIONS: { x: number; y: number; label: string }[] = [
  { x: 0.1, y: 0.1, label: '↖' },
  { x: 0.5, y: 0.1, label: '↑' },
  { x: 0.9, y: 0.1, label: '↗' },
  { x: 0.1, y: 0.5, label: '←' },
  { x: 0.5, y: 0.5, label: '•' },
  { x: 0.9, y: 0.5, label: '→' },
  { x: 0.1, y: 0.9, label: '↙' },
  { x: 0.5, y: 0.9, label: '↓' },
  { x: 0.9, y: 0.9, label: '↘' },
]

interface Props {
  layerId: string
}

export function TextPanel({ layerId }: Props) {
  const layer = useLayerStore((s) =>
    s.layers.find((l) => l.id === layerId && l.type === 'text'),
  )
  const updateConfig = useLayerStore((s) => s.updateConfig)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a layer in the Layers sidebar.
      </div>
    )
  }

  const cfg = layer.config as TextLayerConfig
  const isLocked = layer.locked
  const update = (partial: Partial<TextLayerConfig>) =>
    updateConfig(layerId, partial)

  return (
    <div
      className="space-y-4"
      style={{
        opacity: isLocked ? 0.5 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
      }}
    >
      {isLocked && <LockedLayerBanner />}

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Text
        </p>
        <input
          type="text"
          value={cfg.text}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="Type something…"
          className="w-full rounded border bg-[#0f0f0f] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#3b82f6]"
          style={{ borderColor: '#2a2a2a' }}
        />
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Font
        </p>
        <div className="grid grid-cols-2 gap-1">
          {FONTS.map((font) => {
            const active = cfg.font === font
            return (
              <button
                key={font}
                type="button"
                onClick={() => update({ font })}
                className="rounded border px-2 py-1.5 text-[11px] transition-colors"
                style={{
                  borderColor: active ? '#3b82f6' : '#2a2a2a',
                  background: active
                    ? 'rgba(59,130,246,0.15)'
                    : '#1a1a1a',
                  color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                  fontFamily: `"${font}", sans-serif`,
                }}
              >
                {font}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Weight
        </p>
        <div className="grid grid-cols-3 gap-1">
          {[400, 600, 700].map((w) => {
            const active = cfg.fontWeight === w
            return (
              <button
                key={w}
                type="button"
                onClick={() =>
                  update({ fontWeight: w as 400 | 600 | 700 })
                }
                className="rounded border py-1 text-[10px] transition-colors"
                style={{
                  borderColor: active ? '#3b82f6' : '#2a2a2a',
                  background: active
                    ? 'rgba(59,130,246,0.15)'
                    : '#1a1a1a',
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  fontWeight: w,
                }}
              >
                {w === 400 ? 'Regular' : w === 600 ? 'Semibold' : 'Bold'}
              </button>
            )
          })}
        </div>
      </div>

      <SliderRow
        label="Size"
        hint={`${cfg.fontSize}px`}
        value={cfg.fontSize}
        min={12}
        max={120}
        step={1}
        onChange={(v) => update({ fontSize: Math.round(v) })}
        ariaLabel="Font size"
      />

      <PanelGroup title="Color">
        <ColorRow
          value={cfg.color}
          onChange={(c) => update({ color: c })}
          ariaLabel="text color"
        />
      </PanelGroup>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Quick Position
        </p>
        <div className="grid grid-cols-3 gap-1">
          {POSITIONS.map((pos) => {
            const active =
              Math.abs(cfg.x - pos.x) < 0.05 &&
              Math.abs(cfg.y - pos.y) < 0.05
            return (
              <button
                key={`${pos.x}-${pos.y}`}
                type="button"
                onClick={() => update({ x: pos.x, y: pos.y })}
                aria-label={`Position ${pos.label}`}
                className="flex aspect-square items-center justify-center rounded border text-base transition-colors"
                style={{
                  borderColor: active ? '#3b82f6' : '#2a2a2a',
                  background: active
                    ? 'rgba(59,130,246,0.15)'
                    : '#1a1a1a',
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {pos.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[9px] text-white/30">
          Or drag the text directly on the canvas
        </p>
      </div>

      <SliderRow
        label="Letter spacing"
        hint={`${cfg.letterSpacing}px`}
        value={cfg.letterSpacing}
        min={-2}
        max={10}
        step={0.5}
        onChange={(v) => update({ letterSpacing: v })}
        ariaLabel="Letter spacing"
      />

      <PanelGroup title="Shadow">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Drop shadow</span>
          <Toggle
            checked={cfg.shadowEnabled}
            onChange={(v) => update({ shadowEnabled: v })}
            ariaLabel="Shadow"
          />
        </div>
        <div
          style={{ opacity: cfg.shadowEnabled ? 1 : 0.4 }}
          className="space-y-2"
        >
          <SliderRow
            label="Intensity"
            hint={`${Math.round(cfg.shadowIntensity)}%`}
            value={cfg.shadowIntensity}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ shadowIntensity: v })}
            ariaLabel="Shadow intensity"
          />
          <div>
            <p className="mb-1 text-[11px] text-white/70">Color</p>
            <ColorRow
              value={cfg.shadowColor}
              onChange={(c) => update({ shadowColor: c })}
              ariaLabel="shadow color"
            />
          </div>
        </div>
      </PanelGroup>
    </div>
  )
}

export default TextPanel
