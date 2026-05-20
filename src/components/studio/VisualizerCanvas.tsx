import { useEffect, useRef, type JSX } from 'react'
import { useVisualizerCanvas } from '@/hooks/useVisualizerCanvas'
import { useAnalyzer } from '@/contexts/AnalyzerContext'
import { renderLinearBars } from '@/lib/renderers/linearBars'
import { renderCircularSpectrum } from '@/lib/renderers/circularSpectrum'
import { renderWave } from '@/lib/renderers/wave'
import { renderFramePulse } from '@/lib/renderers/framePulse'
import { renderCoverArt, renderLogoOnly } from '@/lib/renderers/coverArt'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { useCoverArtStore } from '@/store/useCoverArtStore'
import { DEFAULT_VISUALIZER_CONFIG } from '@/lib/visualizerConfig'
import { AnalyzerDebugOverlay } from '@/components/debug/AnalyzerDebugOverlay'

const MAX_BAR_COUNT = 256

export default function VisualizerCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const { canvasRef, ctx, width, height } = useVisualizerCanvas(containerRef)
  const { frequencyData } = useAnalyzer()
  const storeConfig = useVisualizerStore((s) => s.visualizerConfig)
  const backgroundColor = useVisualizerStore((s) => s.backgroundColor)
  const coverArtState = useCoverArtStore()
  const config = storeConfig ?? DEFAULT_VISUALIZER_CONFIG

  const animationRef = useRef<number | null>(null)
  const barsHeightsRef = useRef<Float32Array>(new Float32Array(MAX_BAR_COUNT))
  const circularHeightsRef = useRef<Float32Array>(new Float32Array(MAX_BAR_COUNT))
  const configRef = useRef(config)
  const bgRef = useRef(backgroundColor)
  const dataRef = useRef(frequencyData)
  const coverArtStateRef = useRef(coverArtState)

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    bgRef.current = backgroundColor
  }, [backgroundColor])

  useEffect(() => {
    dataRef.current = frequencyData
  }, [frequencyData])

  useEffect(() => {
    coverArtStateRef.current = coverArtState
  }, [coverArtState])

  useEffect(() => {
    if (!ctx || width === 0 || height === 0) return

    const render = () => {
      const data = dataRef.current
      const cfg = configRef.current
      const cover = coverArtStateRef.current

      ctx.fillStyle = bgRef.current
      ctx.fillRect(0, 0, width, height)

      if (data) {
        switch (cfg.visualType) {
          case 'bars':
            renderLinearBars(
              ctx,
              data,
              cfg.linearBars,
              width,
              height,
              barsHeightsRef.current,
            )
            break
          case 'circular':
            renderCircularSpectrum(
              ctx,
              data,
              cfg.circularSpectrum,
              width,
              height,
              circularHeightsRef.current,
            )
            break
          case 'wave':
            renderWave(ctx, data, cfg.wave, width, height)
            break
          case 'particles':
            break
        }

        if (cfg.framePulse.enabled) {
          renderFramePulse(ctx, data, cfg.framePulse, width, height)
        }
      }

      if (cover.coverArt) {
        renderCoverArt(
          ctx,
          cover.coverArt,
          cover.logo,
          {
            coverArtSize: cover.coverArtSize,
            logoSize: cover.logoSize,
            coverArtCropMode: cover.coverArtCropMode,
            logoCropMode: cover.logoCropMode,
            coverArtPosition: cover.coverArtPosition,
            blurredBgEnabled: cover.blurredBgEnabled,
            blurredBgIntensity: cover.blurredBgIntensity,
          },
          width,
          height,
        )
      } else if (cover.logo) {
        renderLogoOnly(
          ctx,
          cover.logo,
          {
            logoSize: cover.logoSize,
            logoCropMode: cover.logoCropMode,
            coverArtPosition: cover.coverArtPosition,
          },
          width,
          height,
        )
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
      className="relative flex-1 min-w-0 min-h-0 overflow-hidden"
      style={{ background: backgroundColor }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <AnalyzerDebugOverlay />
    </div>
  )
}
