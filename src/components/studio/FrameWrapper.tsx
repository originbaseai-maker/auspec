import { type ReactNode } from 'react'
import { useFrameStore } from '@/store/useFrameStore'

interface Props {
  children: ReactNode
  style?: React.CSSProperties
  className?: string
}

/**
 * Canvas container shell.
 *
 * When `frame.enabled === true`, the wrapper is a pure passthrough — no
 * ring, shadow, or border — because `drawFrame` (src/lib/renderers/frame.ts)
 * paints every frame visual directly onto the canvas so it's captured by
 * `canvas.captureStream()` for export. Any CSS decoration here would
 * double-up with the painted frame.
 *
 * When `frame.enabled === false`, the wrapper applies the studio's default
 * look (soft drop shadow + faint white ring) so the canvas reads against
 * the dark background.
 */
export function FrameWrapper({ children, style, className }: Props) {
  const enabled = useFrameStore((s) => s.enabled)

  if (enabled) {
    return (
      <div
        className={['relative flex overflow-hidden', className]
          .filter(Boolean)
          .join(' ')}
        style={style}
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
