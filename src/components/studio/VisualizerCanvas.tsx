import { useEffect, useRef, type JSX } from 'react'
import { useVisualizerCanvas } from '@/hooks/useVisualizerCanvas'
import { useAnalyzer } from '@/contexts/AnalyzerContext'
import { renderLinearBars } from '@/lib/renderers/linearBars'
import { renderFramePulse } from '@/lib/renderers/framePulse'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { DEFAULT_VISUALIZER_CONFIG } from '@/lib/visualizerConfig'
import { AnalyzerDebugOverlay } from '@/components/debug/AnalyzerDebugOverlay'

const MAX_BAR_COUNT = 256

export default function VisualizerCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const { canvasRef, ctx, width, height } = useVisualizerCanvas(containerRef)
  const { frequencyData } = useAnalyzer()
  const storeConfig = useVisualizerStore((s) => s.visualizerConfig)
  const config = storeConfig ?? DEFAULT_VISUALIZER_CONFIG

  const animationRef = useRef<number | null>(null)
  const previousHeightsRef = useRef<Float32Array>(new Float32Array(MAX_BAR_COUNT))
  const configRef = useRef(config)
  const dataRef = useRef(frequencyData)

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    dataRef.current = frequencyData
  }, [frequencyData])

  useEffect(() => {
    if (!ctx || width === 0 || height === 0) return

    const render = () => {
      const data = dataRef.current
      const cfg = configRef.current

      ctx.clearRect(0, 0, width, height)

      if (data) {
        renderLinearBars(
          ctx,
          data,
          cfg.linearBars,
          width,
          height,
          previousHeightsRef.current,
        )

        if (cfg.framePulse.enabled) {
          renderFramePulse(ctx, data, cfg.framePulse, width, height)
        }
      }

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [ctx, width, height])

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 min-h-0 bg-[#000000] overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <AnalyzerDebugOverlay />
    </div>
  )
}
