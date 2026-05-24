import { type ReactNode } from 'react'
import { useFrameStore } from '@/store/useFrameStore'

interface Props {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
}

function toAlphaHex(intensity: number): string {
  // intensity is 0–100; we map ×1.5 into a 00–FF alpha byte so 100 → 0x96
  const a = Math.max(0, Math.min(255, Math.round(intensity * 1.5)))
  return a.toString(16).padStart(2, '0')
}

/**
 * Canvas container shell.
 *
 * When `frame.enabled === true`:
 *   - The wrapper gets `border-radius: smoothness` so the canvas itself
 *     is clipped to the rounded shape. Without this, a rounded border
 *     painted on the canvas would still leave the canvas's rectangular
 *     corners visible (the background would peek through).
 *   - Halo and drop shadow are rendered as CSS `box-shadow` here rather
 *     than on the canvas. Painting them on the canvas (one blurred
 *     stroke each) made them look like a second nested frame, because
 *     the blur was clipped by the canvas bounds. CSS lets them bleed
 *     OUTSIDE the canvas like real shadows.
 *
 * Trade-off: CSS shadows are NOT captured by `canvas.captureStream()`,
 * so halo and drop shadow will be missing from exported video. The
 * preview is dramatically cleaner this way; if export-baked effects
 * are needed later, they can be added back to `drawFrame` behind a
 * toggle.
 *
 * When `frame.enabled === false`, the wrapper applies the studio's
 * default look (soft drop shadow + faint white ring).
 */
export function FrameWrapper({ children, style, className }: Props) {
  const enabled = useFrameStore((s) => s.enabled)
  const smoothness = useFrameStore((s) => s.smoothness)
  const color = useFrameStore((s) => s.color)
  const haloEnabled = useFrameStore((s) => s.haloEnabled)
  const haloIntensity = useFrameStore((s) => s.haloIntensity)
  const shadowEnabled = useFrameStore((s) => s.shadowEnabled)
  const shadowIntensity = useFrameStore((s) => s.shadowIntensity)
  const shadowColor = useFrameStore((s) => s.shadowColor)

  if (enabled) {
    const shadowStyle =
      shadowEnabled && shadowIntensity > 0
        ? `0 0 ${shadowIntensity * 0.4}px ${shadowIntensity * 0.15}px ${shadowColor}${toAlphaHex(shadowIntensity)}`
        : null
    const haloStyle =
      haloEnabled && haloIntensity > 0
        ? `0 0 ${haloIntensity * 0.5}px ${color}${toAlphaHex(haloIntensity)}`
        : null
    const boxShadow =
      [shadowStyle, haloStyle].filter(Boolean).join(', ') || undefined

    return (
      <div
        className={['relative flex overflow-hidden', className]
          .filter(Boolean)
          .join(' ')}
        style={{
          ...style,
          borderRadius: smoothness > 0 ? `${smoothness}px` : undefined,
          boxShadow,
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={[
        'relative flex overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/[0.04]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </div>
  )
}

export default FrameWrapper
