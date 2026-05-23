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
 * When `frame.enabled === true`, all frame visuals (border, shadow,
 * ambilight, reflection, pulse) are drawn directly on the visualizer
 * canvas via `drawFrame` (see src/lib/renderers/frame.ts). This wrapper
 * becomes a plain passthrough so the export `canvas.captureStream()`
 * picks up every frame pixel.
 *
 * When `frame.enabled === false`, the wrapper applies the studio's
 * default look (a soft drop shadow + faint white ring) so the canvas
 * still reads against the dark background.
 */
export function FrameWrapper({ children, style, className }: Props) {
  const enabled = useFrameStore((s) => s.enabled)

  const baseClassName = enabled
    ? 'relative flex overflow-hidden'
    : 'relative flex overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/[0.04]'

  return (
    <div
      className={[baseClassName, className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </div>
  )
}

export default FrameWrapper
