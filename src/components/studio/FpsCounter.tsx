import { useEffect, useRef, useState } from 'react'

/**
 * Dev-only FPS readout for the visualizer canvas.
 *
 * Runs its own `requestAnimationFrame` loop (independent of the canvas
 * render loop) and reports the rolling average over a ~500 ms window.
 * Color-coded: green ≥ 55, amber ≥ 30, red below. Returns `null` in
 * production builds so it's completely tree-shaken.
 */
export function FpsCounter() {
  const [fps, setFps] = useState(0)
  const framesRef = useRef(0)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    lastTimeRef.current = performance.now()
    let raf = 0
    const tick = () => {
      framesRef.current++
      const now = performance.now()
      const elapsed = now - lastTimeRef.current
      if (elapsed >= 500) {
        setFps(Math.round((framesRef.current * 1000) / elapsed))
        framesRef.current = 0
        lastTimeRef.current = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!import.meta.env.DEV) return null

  return (
    <div
      className="absolute bottom-2 left-2 rounded-md px-2 py-1 text-[10px] font-mono tabular-nums backdrop-blur"
      style={{
        background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: fps >= 55 ? '#10b981' : fps >= 30 ? '#f59e0b' : '#ef4444',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {fps} FPS
    </div>
  )
}

export default FpsCounter
