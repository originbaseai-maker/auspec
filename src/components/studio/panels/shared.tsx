import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { PRESET_PALETTES } from '@/lib/colorPalette'
import { useBrandKitStore } from '@/store/useBrandKitStore'

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

/**
 * Pull the trailing unit out of a hint string ("45%" → "%", "180°" → "°",
 * "1.50×" → "×"). Returns '' for pure-number hints. Used by the value
 * modal so the unit shows alongside the input without the user having
 * to retype it.
 */
function parseHintUnit(hint: string | undefined): string {
  if (!hint) return ''
  const m = hint.match(/[-\d.,\s]+(.*)$/)
  return (m?.[1] ?? '').trim()
}

interface SliderValueModalProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onApply: (v: number) => void
  onClose: () => void
}

/**
 * Tap-on-value editor. Opens centered over the viewport with the
 * current value pre-filled in an autofocus input. Enter or "Set"
 * applies (clamped to [min, max]); "Cancel" or Escape closes without
 * applying. The unit suffix is shown read-only beside the input.
 */
function SliderValueModal({
  label,
  value,
  min,
  max,
  step,
  unit,
  onApply,
  onClose,
}: SliderValueModalProps) {
  const [draft, setDraft] = useState<string>(() => String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const apply = (): void => {
    const parsed = parseFloat(draft.replace(',', '.'))
    if (!Number.isFinite(parsed)) {
      onClose()
      return
    }
    const clamped = Math.max(min, Math.min(max, parsed))
    onApply(clamped)
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${label}`}
        className="fixed left-1/2 top-1/2 z-[71] w-[88vw] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-[#0a0a0a] p-4 shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
      >
        <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-white/60">
          {label}
        </p>
        <div
          className="mx-auto mb-2 flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: '#2a2a2a', background: '#111' }}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply()
            }}
            className="w-full bg-transparent text-center text-[18px] font-semibold tabular-nums text-white outline-none"
            aria-label={`${label} value`}
          />
          {unit && (
            <span className="shrink-0 text-[14px] text-white/40">{unit}</span>
          )}
        </div>
        <p className="mb-3 text-center text-[10px] text-white/30 tabular-nums">
          {min} – {max}
          {step !== 1 ? ` · step ${step}` : ''}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border px-3 py-2 text-[12px] text-white/70 hover:text-white"
            style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-md px-3 py-2 text-[12px] font-medium text-white"
            style={{
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
            }}
          >
            Set
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * Wrap a slider's value hint so it acts as a tap-target opening the
 * SliderValueModal. Shared by SliderRow + CenterSliderRow.
 */
function HintButton({
  hint,
  onClick,
}: {
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded text-[10px] tabular-nums text-white/40 transition-colors hover:text-white/80"
      aria-label={`Edit value (${hint})`}
    >
      {hint}
    </button>
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

/**
 * Bidirectional slider with a visible center tick. Fill grows FROM
 * the center toward the thumb position — left of center → fill
 * leftward, right of center → fill rightward. The native <input
 * type="range"> sits transparently on top to handle pointer + a11y;
 * the visual track / fill / tick / thumb are div overlays.
 *
 * Use this for values where the midpoint carries meaning (canvas
 * center, "unchanged" sensitivity, etc.) instead of the default
 * left-to-right Slider.
 */
/**
 * Snap zone around the center as a fraction of (max - min). 0.02 = 2%
 * — matches the spec. Within this zone the slider snaps to the exact
 * center and fires a 5 ms haptic pulse (graceful no-op on platforms
 * without navigator.vibrate, e.g. desktop Safari).
 */
const CENTER_SNAP_FRACTION = 0.02

function triggerSnapHaptic(): void {
  // navigator.vibrate is not in the lib.dom types in every TS config —
  // narrow via typeof check.
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav && typeof nav.vibrate === 'function') {
    try {
      nav.vibrate(5)
    } catch {
      /* ignore — some browsers throw if not in a user gesture */
    }
  }
}

export function CenterSlider({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  center,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  ariaLabel: string
  /** Defaults to (min + max) / 2. */
  center?: number
}) {
  const c = center ?? (min + max) / 2
  const range = Math.max(max - min, 0.0001)
  const pct = (v: number) => ((v - min) / range) * 100
  const valPct = Math.max(0, Math.min(100, pct(value)))
  const centerPct = Math.max(0, Math.min(100, pct(c)))
  const fillLeft = Math.min(valPct, centerPct)
  const fillRight = Math.max(valPct, centerPct)

  // Track the last value we snapped at so we don't re-vibrate every
  // pointer move while the thumb sits inside the snap zone.
  const wasSnappedRef = useRef(false)

  const snapThreshold = range * CENTER_SNAP_FRACTION

  const handleChange = (raw: number): void => {
    if (Math.abs(raw - c) <= snapThreshold) {
      if (!wasSnappedRef.current) {
        wasSnappedRef.current = true
        triggerSnapHaptic()
      }
      onChange(c)
      return
    }
    wasSnappedRef.current = false
    onChange(raw)
  }

  // ~80 ms ease so the snap-in feels smooth, not jumpy.
  const snapTransition = 'left 80ms cubic-bezier(0.4, 0, 0.2, 1)'

  return (
    <div className="relative h-5 w-full">
      {/* Base track */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{ background: '#1a1a1a' }}
      />
      {/* Fill from center toward thumb */}
      <div
        className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2"
        style={{
          left: `${fillLeft}%`,
          right: `${100 - fillRight}%`,
          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: 999,
          transition: 'left 80ms cubic-bezier(0.4, 0, 0.2, 1), right 80ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      {/* Center tick */}
      <div
        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
        style={{
          left: `${centerPct}%`,
          width: 2,
          height: 10,
          marginLeft: -1,
          background: 'rgba(255,255,255,0.55)',
          borderRadius: 1,
        }}
      />
      {/* Thumb (visual only) */}
      <div
        className="pointer-events-none absolute top-1/2"
        style={{
          left: `${valPct}%`,
          transform: 'translate(-50%, -50%)',
          width: 14,
          height: 14,
          borderRadius: 999,
          background: '#ffffff',
          border: '2px solid #8b5cf6',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          transition: snapTransition,
        }}
      />
      {/* Transparent native input on top for pointer + a11y */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
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
  unit,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  ariaLabel: string
  /** Override the unit shown in the value modal; defaults to the trailing
   *  non-numeric suffix of `hint` (so `45%` → `%`). */
  unit?: string
}) {
  const [editing, setEditing] = useState(false)
  const resolvedUnit = unit ?? parseHintUnit(hint)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-white/70">{label}</span>
        {hint !== undefined &&
          (editing ? null : (
            <HintButton hint={hint} onClick={() => setEditing(true)} />
          ))}
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        ariaLabel={ariaLabel}
      />
      {editing && (
        <SliderValueModal
          label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          unit={resolvedUnit}
          onApply={onChange}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}

/**
 * SliderRow variant rendered with a CenterSlider underneath. Use for
 * values where the midpoint is meaningful (position 50%, sensitivity
 * 100%, etc.). Same props as SliderRow plus an optional `center`
 * override; defaults to (min + max) / 2.
 */
export function CenterSliderRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  center,
  unit,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  ariaLabel: string
  center?: number
  unit?: string
}) {
  const [editing, setEditing] = useState(false)
  const resolvedUnit = unit ?? parseHintUnit(hint)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-white/70">{label}</span>
        {hint !== undefined &&
          (editing ? null : (
            <HintButton hint={hint} onClick={() => setEditing(true)} />
          ))}
      </div>
      <CenterSlider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        ariaLabel={ariaLabel}
        center={center}
      />
      {editing && (
        <SliderValueModal
          label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          unit={resolvedUnit}
          onApply={onChange}
          onClose={() => setEditing(false)}
        />
      )}
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

/**
 * Banner shown at the top of a visualizer panel when its layer is
 * locked. The parent panel should also wrap its body in
 * `opacity: 0.5; pointerEvents: 'none'` so the controls visibly read
 * as disabled.
 */
export function LockedLayerBanner() {
  return (
    <div
      className="rounded-md border px-3 py-2 text-[11px] text-amber-400"
      style={{
        borderColor: 'rgba(245,158,11,0.3)',
        background: 'rgba(245,158,11,0.05)',
      }}
    >
      🔒 Layer is locked. Unlock in the Layers sidebar to edit.
    </div>
  )
}

/**
 * Three per-band sensitivity sliders. Each value is a multiplier
 * (0..2, where 1 = 100% / unchanged). The parent owns state; this
 * component just emits `onChange(band, value)` per change.
 */
export function SensitivityBlock({
  bass,
  mid,
  treble,
  onChange,
}: {
  bass: number
  mid: number
  treble: number
  onChange: (band: 'bass' | 'mid' | 'treble', value: number) => void
}) {
  return (
    <div className="space-y-2">
      <CenterSliderRow
        label="🔉 Bass"
        hint={`${Math.round(bass * 100)}%`}
        value={bass * 100}
        min={0}
        max={200}
        step={5}
        center={100}
        onChange={(v) => onChange('bass', v / 100)}
        ariaLabel="Bass sensitivity"
      />
      <CenterSliderRow
        label="🔊 Mid"
        hint={`${Math.round(mid * 100)}%`}
        value={mid * 100}
        min={0}
        max={200}
        step={5}
        center={100}
        onChange={(v) => onChange('mid', v / 100)}
        ariaLabel="Mid sensitivity"
      />
      <CenterSliderRow
        label="📢 Treble"
        hint={`${Math.round(treble * 100)}%`}
        value={treble * 100}
        min={0}
        max={200}
        step={5}
        center={100}
        onChange={(v) => onChange('treble', v / 100)}
        ariaLabel="Treble sensitivity"
      />
      <p className="text-[9px] text-white/30">
        100% = unchanged · &lt;100% = quieter · &gt;100% = louder
      </p>
    </div>
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
  const brandColors = useBrandKitStore((s) => s.kit.colors)

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

      {brandColors.length >= 2 && (
        <div
          className="rounded-md border p-2"
          style={{ borderColor: '#2a2a2a', background: '#0a0a0a' }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-white/40">
              🎨 Brand Colors
            </span>
            <button
              type="button"
              onClick={() => onChange(brandColors.map((c) => c.value))}
              className="text-[9px] text-blue-400 hover:text-blue-300"
            >
              Apply all →
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {brandColors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  // Append this brand color to the palette unless it's
                  // already there (case-insensitive).
                  const lower = c.value.toLowerCase()
                  if (!colors.some((x) => x.toLowerCase() === lower)) {
                    onChange([...colors, c.value])
                  }
                }}
                title={`${c.name} · ${c.value}`}
                aria-label={`Add brand color ${c.name}`}
                className="h-5 w-5 rounded border transition-transform hover:scale-110"
                style={{ background: c.value, borderColor: '#2a2a2a' }}
              />
            ))}
          </div>
        </div>
      )}

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
