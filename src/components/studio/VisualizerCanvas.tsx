import { useEffect, useRef, type JSX } from 'react'
import { useVisualizerCanvas } from '@/hooks/useVisualizerCanvas'
import { useAnalyzer } from '@/contexts/AnalyzerContext'
import { renderLinearBars } from '@/lib/renderers/linearBars'
import { renderCircularSpectrum } from '@/lib/renderers/circularSpectrum'
import { renderWave } from '@/lib/renderers/wave'
import { renderPolygonSpectrum } from '@/lib/renderers/polygonSpectrum'
import { renderFramePulse } from '@/lib/renderers/framePulse'
import { renderCoverArt, renderLogoOnly } from '@/lib/renderers/coverArt'
import { drawFrame } from '@/lib/renderers/frame'
import { canvasRegistry } from '@/lib/canvasRegistry'
import { generateMockFrequencyData } from '@/lib/mockSpectrum'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { useCoverArtStore } from '@/store/useCoverArtStore'
import { useAudioStore } from '@/store/useAudioStore'
import { useFrameStore } from '@/store/useFrameStore'
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
  const logoSize = useCoverArtStore((s) => s.logoSize)
  const logoCropMode = useCoverArtStore((s) => s.logoCropMode)
  const setLogoCropMode = useCoverArtStore((s) => s.setLogoCropMode)
  const autoLogoSync = useCoverArtStore((s) => s.autoLogoSync)
  const previewMode = useAudioStore((s) => s.previewMode)
  const audioFile = useAudioStore((s) => s.audioFile)
  const frameConfig = useFrameStore()
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

  // Auto Logo Sync: keep the spectrum sized so bars sit just outside the logo.
  // When auto is off the user controls polygon.radius / circular.innerRadius
  // manually via their respective controls.
  useEffect(() => {
    if (!autoLogoSync) return
    if (!logo) return
    if (visualType !== 'polygon' && visualType !== 'circular') return
    if (width === 0 || height === 0) return

    const minDim = Math.min(width, height)

    if (visualType === 'polygon') {
      // Logo display radius at the polygon clip uses the same fallback the
      // renderer uses (minDim * 0.35) scaled by logoSize * 4.
      const logoDisplayRadius = minDim * 0.35 * (logoSize * 4)
      const spectrumRadius = Math.min(
        logoDisplayRadius + 30,
        minDim / 2 - 20,
      )
      updatePolygon({ radius: Math.round(spectrumRadius) })
    } else {
      // circular: inner radius wraps the logo with a 10px gap
      const logoDisplayRadius = (minDim * logoSize) / 2
      updateCircularSpectrum({
        innerRadius: Math.round(logoDisplayRadius + 10),
      })
    }
  }, [
    logoSize,
    autoLogoSync,
    logo,
    visualType,
    width,
    height,
    updatePolygon,
    updateCircularSpectrum,
  ])

  const animationRef = useRef<number | null>(null)
  const barsHeightsRef = useRef<Float32Array>(new Float32Array(MAX_BAR_COUNT))
  const circularHeightsRef = useRef<Float32Array>(new Float32Array(MAX_BAR_COUNT))
  const polygonHeightsRef = useRef<Float32Array>(new Float32Array(MAX_BAR_COUNT))
  const configRef = useRef(config)
  const bgRef = useRef(backgroundColor)
  const dataRef = useRef(frequencyData)
  const coverArtStateRef = useRef(coverArtState)
  const previewModeRef = useRef(previewMode)
  const audioFileRef = useRef(audioFile)
  const frameConfigRef = useRef(frameConfig)

  useEffect(() => {
    previewModeRef.current = previewMode
  }, [previewMode])

  useEffect(() => {
    audioFileRef.current = audioFile
  }, [audioFile])

  useEffect(() => {
    frameConfigRef.current = frameConfig
  }, [frameConfig])

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

  // Expose the canvas to the recorder via a module-level registry so
  // captureStream() can be called from outside the React tree.
  useEffect(() => {
    canvasRegistry.set(canvasRef.current)
    return () => canvasRegistry.set(null)
  }, [canvasRef])

  useEffect(() => {
    if (!ctx || width === 0 || height === 0) return

    const render = () => {
      const realData = dataRef.current
      const cfg = configRef.current
      const cover = coverArtStateRef.current

      // Preview Mode: synthesize a beat-driven spectrum ONLY when no audio
      // is loaded, so designers can preview without music. Once audio is
      // loaded (even paused), we never fall back to mock — paused playback
      // shows the last real frame instead of an animated fake.
      const hasAudio = audioFileRef.current !== null
      const data =
        realData ??
        (!hasAudio && previewModeRef.current
          ? generateMockFrequencyData(performance.now() / 1000)
          : null)

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
          case 'polygon': {
            // Draw the logo FIRST so the spectrum bars stay on top.
            // In auto mode the logo fills the polygon exactly (scale 1.0);
            // in manual mode the user's logoSize acts as a 0.5–2.0× scale.
            if (cover.logo) {
              const minDim = Math.min(width, height)
              const baseRadius = Math.min(
                cfg.polygon.radius,
                Math.max(0, minDim / 2 - 20),
              )
              const logoScale = cover.autoLogoSync
                ? 1.0
                : Math.max(0.5, Math.min(2.0, cover.logoSize * 4))
              renderLogoOnly(
                ctx,
                cover.logo,
                {
                  logoSize: cover.logoSize,
                  logoCropMode: cover.logoCropMode,
                  coverArtPosition: cover.coverArtPosition,
                  polygonShape: cfg.polygon.shape,
                  polygonRotation: cfg.polygon.rotation,
                  polygonRadius: baseRadius * logoScale,
                },
                width,
                height,
              )
            }
            renderPolygonSpectrum(
              ctx,
              data,
              cfg.polygon,
              width,
              height,
              polygonHeightsRef.current,
            )
            break
          }
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
      } else if (cover.logo && cfg.visualType !== 'polygon') {
        // Non-polygon modes draw the logo on top with its crop mode.
        // Polygon mode draws the logo underneath the bars inside its case.
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

      // Frame draws LAST so its border, shadow, halo, and reflection sit
      // on top of everything. Painted onto the canvas (not as CSS) so
      // captureStream() includes it in exported video.
      const bassEnergy = data ? data.bass / 255 : 0
      drawFrame(ctx, width, height, frameConfigRef.current, bassEnergy)

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
