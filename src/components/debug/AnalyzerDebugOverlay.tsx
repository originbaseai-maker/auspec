import { useEffect, useState } from 'react'
import { useAnalyzer } from '@/contexts/AnalyzerContext'

const BAR_MAX_WIDTH = 100

function Bar({ label, value, max = 255 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-[10px] uppercase tracking-wider text-white/60">
        {label}
      </span>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
        style={{ width: BAR_MAX_WIDTH }}
      >
        <div
          className="h-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] transition-[width] duration-75"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-[10px] tabular-nums text-white/80">
        {Math.round(value)}
      </span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wider text-white/60">{label}</span>
      <span className="text-[11px] tabular-nums text-white">{String(value)}</span>
    </div>
  )
}

export function AnalyzerDebugOverlay() {
  const [visible, setVisible] = useState(false)
  const [, setTick] = useState(0)
  const { frequencyData, isAnalyzing, analyzerConfig } = useAnalyzer()

  // The analyzer emits a STABLE FrequencyData reference (fields mutated
  // in place) so React's setState dedupes the per-frame push — great for
  // perf, but it means this overlay would freeze. We run our own rAF
  // tick whenever the overlay is visible to force re-reads of the live
  // values. ~10 Hz is plenty for a numeric readout.
  useEffect(() => {
    if (!visible) return
    let raf = 0
    let lastTick = 0
    const tick = (t: number) => {
      if (t - lastTick >= 100) {
        setTick((n) => n + 1)
        lastTick = t
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
        e.preventDefault()
        setVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!import.meta.env.DEV) return null
  if (!visible) return null

  const bass = frequencyData?.bass ?? 0
  const mid = frequencyData?.mid ?? 0
  const treble = frequencyData?.treble ?? 0
  const rms = frequencyData?.rms ?? 0
  const peak = frequencyData?.peak ?? 0
  const beat = frequencyData?.beatEnergy ?? 0
  const beatHot = beat > 0.7

  return (
    <div
      className="pointer-events-auto absolute right-6 top-6 z-50 select-none rounded-lg border border-[#2a2a2a] bg-black/80 p-3 font-mono text-white shadow-xl backdrop-blur-md"
      style={{ minWidth: 220 }}
      role="region"
      aria-label="Analyzer debug overlay"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
          Analyzer
        </span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded px-1.5 text-[10px] text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Close debug overlay"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Bar label="Bass" value={bass} />
        <Bar label="Mid" value={mid} />
        <Bar label="Treble" value={treble} />
      </div>

      <div className="my-2 h-px bg-white/10" />

      <div className="flex flex-col gap-1">
        <Row label="RMS" value={rms.toFixed(2)} />
        <Row label="Peak" value={Math.round(peak)} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-wider text-white/60">
            Beat
          </span>
          <span
            className={
              beatHot
                ? 'text-[11px] tabular-nums text-red-400 animate-pulse'
                : 'text-[11px] tabular-nums text-white'
            }
          >
            {beat.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="my-2 h-px bg-white/10" />

      <div className="flex flex-col gap-1">
        <Row label="FFT" value={analyzerConfig.fftSize} />
        <Row label="Smooth" value={analyzerConfig.smoothingTimeConstant.toFixed(2)} />
        <Row label="Active" value={isAnalyzing} />
      </div>

      <div className="mt-2 text-center text-[9px] uppercase tracking-wider text-white/30">
        Shift+D to toggle
      </div>
    </div>
  )
}

export default AnalyzerDebugOverlay
