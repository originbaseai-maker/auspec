import { useBrandKitStore } from '@/store/useBrandKitStore'
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
  // All hooks MUST be called unconditionally at the top, before any
  // early return. Previously useBrandKitStore was placed AFTER the
  // `if (!layer) return` guard, so a render where the layer lookup
  // came back undefined called 2 hooks while the next render (layer
  // populated) called 3 — React #310 "Rendered more hooks than during
  // the previous render."
  //
  // The lookup ALSO checks the draft slot. Clicking the Text tool
  // calls startDraft('text'), which writes the layer to s.draftLayer
  // (not s.layers). Without the draft-aware lookup, the first render
  // after startDraft sees `undefined` for the freshly-drafted text
  // layer, which is a second route to the same #310 crash once the
  // draft commits and the lookup count flips. Both routes manifest
  // most often "from a preset" because preset stacks make the
  // active-layer transitions more frequent.
  const layer = useLayerStore((s) => {
    if (s.draftLayer && s.draftLayer.id === layerId && s.draftLayer.type === 'text') {
      return s.draftLayer
    }
    return s.layers.find((l) => l.id === layerId && l.type === 'text')
  })
  const updateConfig = useLayerStore((s) => s.updateConfig)
  const brandFonts = useBrandKitStore((s) => s.kit.fonts)

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

      {(brandFonts.primary || brandFonts.secondary) && (
        <div
          className="rounded-md border p-2"
          style={{ borderColor: '#2a2a2a', background: '#0a0a0a' }}
        >
          <p className="mb-1 text-[9px] uppercase tracking-wider text-white/40">
            🎨 Brand
          </p>
          <div className="flex gap-1">
            {brandFonts.primary && (
              <button
                type="button"
                onClick={() =>
                  brandFonts.primary && update({ font: brandFonts.primary })
                }
                className="flex-1 rounded border px-2 py-1.5 text-[11px]"
                style={{
                  borderColor:
                    cfg.font === brandFonts.primary ? '#3b82f6' : '#2a2a2a',
                  background:
                    cfg.font === brandFonts.primary
                      ? 'rgba(59,130,246,0.15)'
                      : '#1a1a1a',
                  color: '#fff',
                  fontFamily: `"${brandFonts.primary}", sans-serif`,
                }}
              >
                {brandFonts.primary}
                <span className="ml-1 text-[8px] text-white/40">primary</span>
              </button>
            )}
            {brandFonts.secondary && (
              <button
                type="button"
                onClick={() =>
                  brandFonts.secondary &&
                  update({ font: brandFonts.secondary })
                }
                className="flex-1 rounded border px-2 py-1.5 text-[11px]"
                style={{
                  borderColor:
                    cfg.font === brandFonts.secondary
                      ? '#3b82f6'
                      : '#2a2a2a',
                  background:
                    cfg.font === brandFonts.secondary
                      ? 'rgba(59,130,246,0.15)'
                      : '#1a1a1a',
                  color: '#fff',
                  fontFamily: `"${brandFonts.secondary}", sans-serif`,
                }}
              >
                {brandFonts.secondary}
                <span className="ml-1 text-[8px] text-white/40">
                  secondary
                </span>
              </button>
            )}
          </div>
        </div>
      )}

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
