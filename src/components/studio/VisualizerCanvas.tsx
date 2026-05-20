import { useEffect, useRef, type JSX } from 'react'
import { useVisualizerCanvas } from '@/hooks/useVisualizerCanvas'
import { useAnalyzer } from '@/contexts/AnalyzerContext'
import { renderLinearBars } from '@/lib/renderers/linearBars'
import { renderCircularSpectrum } from '@/lib/renderers/circularSpectrum'
import { renderWave } from '@/lib/renderers/wave'
import { renderPolygonSpectrum } from '@/lib/renderers/polygonSpectrum'
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
  const visualType = useVisualizerStore((s) => s.visualType)
  const setVisualType = useVisualizerStore((s) => s.setVisualType)
  const updateCircularSpectrum = useVisualizerStore((s) => s.updateCircularSpectrum)
  const updatePolygon = useVisualizerStore((s) => s.updatePolygon)
  const polygonShape = useVisualizerStore((s) => s.visualizerConfig.polygon.shape)
  const coverArtState = useCoverArtStore()
  const logo = useCoverArtStore((s) => s.logo)
  const logoCropMode = useCoverArtStore((s) => s.logoCropMode)
  const setLogoCropMode = useCoverArtStore((s) => s.setLogoCropMode)
  const config = storeConfig ?? DEFAULT_VISUALIZER_CONFIG

  // Smart Logo Mode: when a logo is uploaded, auto-pick a visualizer that
  // wraps its shape. Only fires when the logo or its crop mode changes —
  // the user can still manually pick a different visual type afterwards.
  useEffect(() => {
    if (!logo) return
    if (logoCropMode === 'circle') {
      setVisualType('circular')
      updateCircularSpectrum({ bassPulse: true })
    } else if (logoCropMode === 'square') {
      setVisualType('polygon')
      updatePolygon({ shape: 'square' })
    }
    // 'none' → leave the current visual type alone
  }, [logo, logoCropMode, setVisualType, updateCircularSpectrum, updatePolygon])

  // Polygon-shape → logo crop sync: when the user changes polygon shape,
  // drop the logo crop so the polygon itself frames the full image.
  useEffect(() => {
    if (!logo) return
    if (visualType !== 'polygon') return
    if (logoCropMode !== 'none') {
      setLogoCropMode('none')
    }
  }, [polygonShape, logo, visualType, logoCropMode, setLogoCropMode])

  const animationRef = useRef<number | null>(null)
  const barsHeightsRef = useRef<Float32Array>(new Float32Array(MAX_BAR_COUNT))
  const circularHeightsRef = useRef<Float32Array>(new Float32Array(MAX_BAR_COUNT))
  const polygonHeightsRef = useRef<Float32Array>(new Float32Array(MAX_BAR_COUNT))
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
              cover.logo ? cover.logoSize : undefined,
            )
            break
          case 'wave':
            renderWave(ctx, data, cfg.wave, width, height)
            break
          case 'polygon':
            renderPolygonSpectrum(
              ctx,
              data,
              cfg.polygon,
              width,
              height,
              polygonHeightsRef.current,
            )
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
        const isPolygon = cfg.visualType === 'polygon'
        // Polygon mode: clip the logo to the SAME scaled radius the polygon
        // spectrum uses internally (see polygonSpectrum.ts line 194–195) so
        // the logo fills the polygon outline exactly.
        const polygonRadius = isPolygon
          ? Math.min(
              cfg.polygon.radius,
              Math.max(0, Math.min(width, height) / 2 - 20),
            )
          : undefined
        renderLogoOnly(
          ctx,
          cover.logo,
          {
            logoSize: cover.logoSize,
            logoCropMode: cover.logoCropMode,
            coverArtPosition: cover.coverArtPosition,
            polygonShape: isPolygon ? cfg.polygon.shape : undefined,
            polygonRotation: isPolygon ? cfg.polygon.rotation : undefined,
            polygonRadius,
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
