import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { PRESET_PALETTES } from '@/lib/colorPalette'

export const COLOR_SWATCHES = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#a855f7',
  '#ec4899',
  '#f59e0b',
  '#14b8a6',
  '#ffffff',
] as const

export const BG_SWATCHES = [
  '#000000',
  '#0a0a0f',
  '#0f172a',
  '#100805',
  '#052e2b',
  '#1a1a1a',
] as const

export function SectionHeader({
  title,
  hint,
}: {
  title: string
  hint?: string
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
        {title}
      </h4>
      {hint && (
        <span className="text-[9px] tabular-nums text-white/40">{hint}</span>
      )}
    </div>
  )
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  ariaLabel: string
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      aria-label={ariaLabel}
      className="auspec-slider w-full"
    />
  )
}

export function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full p-0.5 border transition-colors"
      style={{
        borderColor: '#2a2a2a',
        background: checked
          ? 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)'
          : '#1a1a1a',
      }}
    >
      <span
        className="block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}

export function ColorSwatch({
  color,
  active,
  onClick,
}: {
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select color ${color}`}
      aria-pressed={active}
      className="h-6 w-6 rounded-full border transition-transform hover:scale-110"
      style={{
        background: color,
        borderColor: active ? '#ffffff' : '#2a2a2a',
        boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none',
      }}
    />
  )
}

export function ColorRow({
  value,
  onChange,
  ariaLabel,
  swatches = COLOR_SWATCHES,
}: {
  value: string
  onChange: (color: string) => void
  ariaLabel: string
  swatches?: readonly string[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {swatches.map((c) => (
        <ColorSwatch
          key={c}
          color={c}
          active={value.toLowerCase() === c.toLowerCase()}
          onClick={() => onChange(c)}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Custom ${ariaLabel}`}
        className="h-6 w-6 rounded-full border border-[#2a2a2a] bg-transparent cursor-pointer"
      />
    </div>
  )
}

export function SegmentedGroup<T extends string>({
  options,
  value,
  onChange,
  cols = 3,
}: {
  options: ReadonlyArray<{ id: T; label: string; sub?: string }>
  value: T
  onChange: (v: T) => void
  cols?: 2 | 3 | 4
}) {
  const gridClass =
    cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3'
  return (
    <div className={`grid gap-1 ${gridClass}`}>
      {options.map(({ id, label, sub }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className="flex flex-col items-center rounded border py-1.5 transition-colors"
            style={{
              borderColor: active ? '#3b82f6' : '#2a2a2a',
              background: active ? 'rgba(59,130,246,0.15)' : '#1a1a1a',
              color: active ? '#fff' : 'rgba(255,255,255,0.6)',
            }}
          >
            <span className="text-[11px] font-medium capitalize">{label}</span>
            {sub && (
              <span className="text-[9px] text-white/40">{sub}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  ariaLabel: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-white/70">{label}</span>
        {hint !== undefined && (
          <span className="text-[10px] tabular-nums text-white/40">{hint}</span>
        )}
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        ariaLabel={ariaLabel}
      />
    </div>
  )
}

export function FreqRangeBlock({
  start,
  end,
  setStart,
  setEnd,
}: {
  start: number
  end: number
  setStart: (v: number) => void
  setEnd: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <SliderRow
        label="Start"
        hint={`${start} Hz`}
        value={start}
        min={20}
        max={2000}
        step={10}
        onChange={setStart}
        ariaLabel="Start frequency"
      />
      <SliderRow
        label="End"
        hint={`${end} Hz`}
        value={end}
        min={2000}
        max={20000}
        step={100}
        onChange={setEnd}
        ariaLabel="End frequency"
      />
    </div>
  )
}

export function PanelGroup({
  title,
  children,
  hint,
}: {
  title?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <section className="space-y-2">
      {title && <SectionHeader title={title} hint={hint} />}
      {children}
    </section>
  )
}

const MAX_PALETTE_SIZE = 7
const MIN_PALETTE_SIZE = 2

/**
 * Editor for a multi-color palette (3-7 stops).
 *
 * When `palette` is `undefined`, the editor displays [fallbackStart,
 * fallbackEnd] as if it were a 2-stop palette — letting users tweak
 * legacy 2-color configs without thinking about modes. Editing any stop
 * commits a defined palette via `onChange`. Pressing "Reset to 2-color
 * gradient" calls `onChange(undefined)` to return to legacy mode.
 */
export function PaletteEditor({
  palette,
  onChange,
  fallbackStart,
  fallbackEnd,
}: {
  palette: string[] | undefined
  onChange: (palette: string[] | undefined) => void
  fallbackStart: string
  fallbackEnd: string
}) {
  const [showPresets, setShowPresets] = useState(false)

  const colors = palette ?? [fallbackStart, fallbackEnd]
  const isPaletteMode = palette !== undefined && palette.length >= 2

  const updateColor = (index: number, color: string) => {
    const next = [...colors]
    next[index] = color
    onChange(next)
  }

  const addColor = () => {
    if (colors.length >= MAX_PALETTE_SIZE) return
    onChange([...colors, '#ffffff'])
  }

  const removeColor = (index: number) => {
    if (colors.length <= MIN_PALETTE_SIZE) return
    onChange(colors.filter((_, i) => i !== index))
  }

  const applyPreset = (preset: string[]) => {
    onChange([...preset])
    setShowPresets(false)
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {colors.map((color, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={color.startsWith('#') ? color : '#ffffff'}
              onChange={(e) => updateColor(i, e.target.value)}
              className="h-7 w-9 cursor-pointer rounded border bg-transparent"
              style={{ borderColor: '#2a2a2a' }}
              aria-label={`Color stop ${i + 1}`}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => updateColor(i, e.target.value)}
              className="flex-1 rounded border bg-[#0f0f0f] px-2 py-1 text-[11px] text-white outline-none focus:border-[#3b82f6]"
              style={{ borderColor: '#2a2a2a' }}
              aria-label={`Color stop ${i + 1} hex`}
            />
            {colors.length > MIN_PALETTE_SIZE && (
              <button
                type="button"
                onClick={() => removeColor(i)}
                aria-label={`Remove color ${i + 1}`}
                className="flex h-7 w-7 items-center justify-center rounded text-white/40 hover:bg-red-500/15 hover:text-red-400"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div
        className="h-3 w-full rounded border"
        style={{
          borderColor: '#2a2a2a',
          background: `linear-gradient(90deg, ${colors.join(', ')})`,
        }}
        aria-hidden="true"
      />

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={addColor}
          disabled={colors.length >= MAX_PALETTE_SIZE}
          className="flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10px] text-white/70 hover:text-white disabled:opacity-40"
          style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          Add color ({colors.length}/{MAX_PALETTE_SIZE})
        </button>
        <button
          type="button"
          onClick={() => setShowPresets((v) => !v)}
          aria-expanded={showPresets}
          className="rounded-md border px-2 py-1.5 text-[10px] text-white/70 hover:text-white"
          style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
        >
          Presets
        </button>
      </div>

      {showPresets && (
        <div
          className="space-y-1 rounded-md border p-2"
          style={{ borderColor: '#2a2a2a', background: '#0a0a0a' }}
        >
          {PRESET_PALETTES.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p.colors)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-white/5"
            >
              <div
                className="h-3 w-12 rounded"
                style={{
                  background: `linear-gradient(90deg, ${p.colors.join(', ')})`,
                }}
                aria-hidden="true"
              />
              <span className="text-[11px] text-white/80">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      {isPaletteMode && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="w-full text-center text-[9px] text-white/30 hover:text-white/60"
        >
          ↺ Reset to 2-color gradient
        </button>
      )}
    </div>
  )
}
