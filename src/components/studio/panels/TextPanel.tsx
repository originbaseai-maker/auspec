import { useState, type JSX } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  useTextStore,
  type FontFamily,
  type TextLayer,
  type TextLayerId,
  type TextPosition,
} from '@/store/useTextStore'
import { ColorRow, PanelGroup, SliderRow, Toggle } from './shared'

const FONTS: FontFamily[] = [
  'Inter',
  'Bebas Neue',
  'Playfair Display',
  'Pacifico',
  'Space Mono',
]

const POSITIONS: { id: TextPosition; label: string }[] = [
  { id: 'top-left', label: '↖' },
  { id: 'top-center', label: '↑' },
  { id: 'top-right', label: '↗' },
  { id: 'middle-left', label: '←' },
  { id: 'center', label: '•' },
  { id: 'middle-right', label: '→' },
  { id: 'bottom-left', label: '↙' },
  { id: 'bottom-center', label: '↓' },
  { id: 'bottom-right', label: '↘' },
]

interface LayerSectionProps {
  layerId: TextLayerId
  title: string
  placeholder: string
}

function LayerSection({
  layerId,
  title,
  placeholder,
}: LayerSectionProps): JSX.Element {
  const layer = useTextStore((s) => s[layerId])
  const setLayer = useTextStore((s) => s.setLayer)
  const [open, setOpen] = useState(layer.enabled)

  const update = (partial: Partial<TextLayer>) => setLayer(layerId, partial)

  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: '#2a2a2a', background: '#0a0a0a' }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronRight
            className="h-3 w-3 shrink-0 text-white/50 transition-transform"
            style={{ transform: open ? 'rotate(90deg)' : 'none' }}
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
            {title}
          </span>
          {layer.enabled && layer.text.trim() && (
            <>
              <span className="text-[10px] text-white/40">·</span>
              <span className="truncate text-[10px] text-white/50">
                {layer.text}
              </span>
            </>
          )}
        </span>
        <span
          // The header button toggles "open"; we render a Toggle inside but
          // intercept its click so it doesn't also flip "open".
          onClick={(e) => e.stopPropagation()}
        >
          <Toggle
            checked={layer.enabled}
            onChange={(v) => {
              update({ enabled: v })
              if (v) setOpen(true)
            }}
            ariaLabel={`Enable ${title}`}
          />
        </span>
      </button>

      {open && (
        <div
          className="space-y-4 border-t px-3 py-3"
          style={{ borderColor: '#2a2a2a' }}
        >
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Text
            </p>
            <input
              type="text"
              value={layer.text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder={placeholder}
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
                const active = layer.font === font
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
                const active = layer.fontWeight === w
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
            hint={`${layer.fontSize}px`}
            value={layer.fontSize}
            min={12}
            max={120}
            step={1}
            onChange={(v) => update({ fontSize: Math.round(v) })}
            ariaLabel="Font size"
          />

          <PanelGroup title="Color">
            <ColorRow
              value={layer.color}
              onChange={(c) => update({ color: c })}
              ariaLabel="text color"
            />
          </PanelGroup>

          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Position
            </p>
            <div className="grid grid-cols-3 gap-1">
              {POSITIONS.map((pos) => {
                const active = layer.position === pos.id
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => update({ position: pos.id })}
                    aria-label={pos.id}
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
          </div>

          <SliderRow
            label="Letter spacing"
            hint={`${layer.letterSpacing}px`}
            value={layer.letterSpacing}
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
                checked={layer.shadowEnabled}
                onChange={(v) => update({ shadowEnabled: v })}
                ariaLabel="Shadow"
              />
            </div>
            <div
              style={{ opacity: layer.shadowEnabled ? 1 : 0.4 }}
              className="space-y-2"
            >
              <SliderRow
                label="Intensity"
                hint={`${Math.round(layer.shadowIntensity)}%`}
                value={layer.shadowIntensity}
                min={0}
                max={100}
                step={1}
                onChange={(v) => update({ shadowIntensity: v })}
                ariaLabel="Shadow intensity"
              />
              <div>
                <p className="mb-1 text-[11px] text-white/70">Color</p>
                <ColorRow
                  value={layer.shadowColor}
                  onChange={(c) => update({ shadowColor: c })}
                  ariaLabel="shadow color"
                />
              </div>
            </div>
          </PanelGroup>
        </div>
      )}
    </div>
  )
}

export function TextPanel(): JSX.Element {
  const resetAll = useTextStore((s) => s.resetAll)

  return (
    <div className="space-y-3">
      <p className="text-[10px] leading-relaxed text-white/40">
        Add song title, artist name, or a custom line. Auto-fills from
        filename if formatted as "Artist - Title.mp3".
      </p>

      <LayerSection
        layerId="title"
        title="Song Title"
        placeholder="My Song"
      />
      <LayerSection
        layerId="artist"
        title="Artist"
        placeholder="Artist Name"
      />
      <LayerSection
        layerId="custom"
        title="Custom Line"
        placeholder="Album, Tour, Tagline..."
      />

      <button
        type="button"
        onClick={resetAll}
        className="mt-2 w-full rounded-md border px-2 py-1.5 text-[10px] text-white/50 hover:text-white/80 transition-colors"
        style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
      >
        ↻ Reset all text
      </button>
    </div>
  )
}

export default TextPanel
