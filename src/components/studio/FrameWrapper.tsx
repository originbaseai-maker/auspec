import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrameStore } from '@/store/useFrameStore'
import { useAudioStore } from '@/store/useAudioStore'
import { useAnalyzer } from '@/contexts/AnalyzerContext'
import { generateMockFrequencyData } from '@/lib/mockSpectrum'

interface Props {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
}

function alphaHex(intensity: number): string {
  // Convert 0–100 intensity to a two-char hex alpha (00–FF).
  const a = Math.max(0, Math.min(255, Math.round(intensity * 2.55)))
  return a.toString(16).padStart(2, '0')
}

export function FrameWrapper({ children, style, className }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const enabled = useFrameStore((s) => s.enabled)
  const color = useFrameStore((s) => s.color)
  const thickness = useFrameStore((s) => s.thickness)
  const smoothness = useFrameStore((s) => s.smoothness)
  const ambilightEnabled = useFrameStore((s) => s.ambilightEnabled)
  const ambilightIntensity = useFrameStore((s) => s.ambilightIntensity)
  const shadowEnabled = useFrameStore((s) => s.shadowEnabled)
  const shadowIntensity = useFrameStore((s) => s.shadowIntensity)
  const shadowColor = useFrameStore((s) => s.shadowColor)
  const reflectionEnabled = useFrameStore((s) => s.reflectionEnabled)
  const reflectionIntensity = useFrameStore((s) => s.reflectionIntensity)
  const pulseEnabled = useFrameStore((s) => s.pulseEnabled)
  const pulseIntensity = useFrameStore((s) => s.pulseIntensity)

  // Mirror VisualizerCanvas's pattern: subscribe to frequencyData (causes
  // ~60fps re-renders, same as VisualizerCanvas) and sync into a ref the
  // rAF tick can read without re-running the effect.
  const { frequencyData } = useAnalyzer()
  const dataRef = useRef(frequencyData)
  useEffect(() => {
    dataRef.current = frequencyData
  }, [frequencyData])

  const previewMode = useAudioStore((s) => s.previewMode)
  const previewModeRef = useRef(previewMode)
  useEffect(() => {
    previewModeRef.current = previewMode
  }, [previewMode])

  // Beat-reactive thickness — writes --frame-pulse on the DOM via rAF so
  // we don't trigger React renders on every beat tick.
  useEffect(() => {
    if (!enabled || !pulseEnabled) {
      wrapperRef.current?.style.setProperty('--frame-pulse', '0')
      return
    }
    let rafId = 0
    const tick = () => {
      const realData = dataRef.current
      const data =
        realData ??
        (previewModeRef.current
          ? generateMockFrequencyData(performance.now() / 1000)
          : null)
      const bass = data ? data.bass / 255 : 0
      const pulseScale = bass * (pulseIntensity / 100)
      wrapperRef.current?.style.setProperty(
        '--frame-pulse',
        pulseScale.toFixed(3),
      )
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [enabled, pulseEnabled, pulseIntensity])

  const frameStyle = useMemo<React.CSSProperties | null>(() => {
    if (!enabled) return null

    const borderWidthExpr = pulseEnabled
      ? `calc(${thickness}px * (1 + var(--frame-pulse, 0)))`
      : `${thickness}px`

    const shadow = shadowEnabled
      ? `0 ${Math.round(shadowIntensity * 0.15)}px ${Math.round(shadowIntensity * 0.6)}px ${shadowColor}${alphaHex(shadowIntensity)}`
      : ''
    const ambilight = ambilightEnabled
      ? `0 0 ${Math.round(ambilightIntensity * 0.8)}px ${color}${alphaHex(ambilightIntensity * 0.7)}`
      : ''
    const combinedShadow = [shadow, ambilight].filter(Boolean).join(', ')

    return {
      borderStyle: 'solid',
      borderColor: color,
      borderWidth: borderWidthExpr,
      borderRadius: `${smoothness}px`,
      boxShadow: combinedShadow || undefined,
    }
  }, [
    enabled,
    color,
    thickness,
    smoothness,
    ambilightEnabled,
    ambilightIntensity,
    shadowEnabled,
    shadowIntensity,
    shadowColor,
    pulseEnabled,
  ])

  const defaultClassName = enabled
    ? 'relative flex overflow-hidden'
    : 'relative flex overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/[0.04]'

  const mergedStyle: React.CSSProperties = frameStyle
    ? { ...style, ...frameStyle }
    : (style ?? {})

  return (
    <div
      ref={wrapperRef}
      className={[defaultClassName, className].filter(Boolean).join(' ')}
      style={mergedStyle}
    >
      {children}
      {enabled && reflectionEnabled && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,${(reflectionIntensity / 100) * 0.25}) 0%, transparent 40%, transparent 60%, rgba(255,255,255,${(reflectionIntensity / 100) * 0.08}) 100%)`,
            borderRadius: `${smoothness}px`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export default FrameWrapper
