import { useEffect, useRef, useState, type RefObject } from 'react'

export interface UseVisualizerCanvasResult {
  canvasRef: RefObject<HTMLCanvasElement | null>
  ctx: CanvasRenderingContext2D | null
  width: number
  height: number
  dpr: number
}

export function useVisualizerCanvas(
  containerRef: RefObject<HTMLDivElement | null>,
): UseVisualizerCanvasResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    dpr: 1,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    ctxRef.current = canvas.getContext('2d')

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const { width, height } = container.getBoundingClientRect()
      if (width === 0 || height === 0) return

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Reset transform before scaling so repeated resizes don't compound.
      ctxRef.current?.setTransform(dpr, 0, 0, dpr, 0, 0)

      setDimensions({ width, height, dpr })
    }

    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    return () => {
      observer.disconnect()
    }
  }, [containerRef])

  return {
    canvasRef,
    ctx: ctxRef.current,
    width: dimensions.width,
    height: dimensions.height,
    dpr: dimensions.dpr,
  }
}
