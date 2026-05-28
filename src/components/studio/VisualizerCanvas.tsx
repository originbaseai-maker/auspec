import { useEffect, useRef, type JSX } from 'react'
import { useVisualizerCanvas } from '@/hooks/useVisualizerCanvas'
import { useAnalyzer } from '@/contexts/AnalyzerContext'
import { renderLinearBars } from '@/lib/renderers/linearBars'
import { renderCircularSpectrum } from '@/lib/renderers/circularSpectrum'
import { renderWave } from '@/lib/renderers/wave'
import { renderPolygonSpectrum } from '@/lib/renderers/polygonSpectrum'
import { renderFramePulse } from '@/lib/renderers/framePulse'
import {
  drawLogoLayer,
  renderCoverArt,
  renderLogoOnly,
} from '@/lib/renderers/coverArt'
import { drawFrameLayer } from '@/lib/renderers/frame'
import { drawTextLayer } from '@/lib/renderers/textOverlay'
import { drawParticlesForLayer } from '@/lib/renderers/particles'
import { drawBackgroundLayer } from '@/lib/renderers/background'
import { drawBloom } from '@/lib/renderers/bloom'
import { drawCustomShape } from '@/lib/renderers/customShape'
import { drawHaloLayer } from '@/lib/renderers/halo'
import { drawCinematic } from '@/lib/renderers/cinematic'
import { drawVideoLayer } from '@/lib/renderers/video'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import {
  getPoolEntries,
  removeVideoElement,
  setVideoElement,
} from '@/lib/videoPool'
import { canvasRegistry } from '@/lib/canvasRegistry'
import { generateMockFrequencyData } from '@/lib/mockSpectrum'
import { resolveAnalyserSource } from '@/lib/masterClock'
import type { FrequencyData } from '@/types/analyzer'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { useCoverArtStore } from '@/store/useCoverArtStore'
import { useAudioStore } from '@/store/useAudioStore'
import { useLayerStore } from '@/store/useLayerStore'
import type { Layer } from '@/types/layer'
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
  const isPlaying = useAudioStore((s) => s.isPlaying)
  const currentTime = useAudioStore((s) => s.currentTime)
  const audioSource = useAudioStore((s) => s.audioSource)
  const videoAudioAssetId = useAudioStore((s) => s.videoAudioAssetId)
  const layers = useLayerStore((s) => s.layers)
  const draftLayer = useLayerStore((s) => s.draftLayer)
  const videoAssets = useVideoAssetStore((s) => s.assets)
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
  const layersRef = useRef(layers)
  const draftLayerRef = useRef(draftLayer)

  useEffect(() => {
    layersRef.current = layers
  }, [layers])

  useEffect(() => {
    draftLayerRef.current = draftLayer
  }, [draftLayer])

  useEffect(() => {
    previewModeRef.current = previewMode
  }, [previewMode])

  useEffect(() => {
    audioFileRef.current = audioFile
  }, [audioFile])

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

  // ----- Video Asset Pool Lifecycle -----
  // Mirror useVideoAssetStore.assets into the module-level HTMLVideoElement
  // pool. One <video> element per asset (shared across all layers that
  // reference it). Removed assets get their element torn down + their blob
  // URL revoked by the store.
  useEffect(() => {
    // Add missing
    for (const asset of videoAssets) {
      const existing = getPoolEntries().find(([id]) => id === asset.id)
      if (!existing) {
        const v = document.createElement('video')
        v.src = asset.src
        v.muted = true
        v.playsInline = true
        v.loop = true
        v.crossOrigin = 'anonymous'
        v.preload = 'auto'
        v.load()
        setVideoElement(asset.id, v)
      }
    }
    // Remove orphans (asset was deleted from the store)
    for (const [id] of getPoolEntries()) {
      if (!videoAssets.find((a) => a.id === id)) {
        removeVideoElement(id)
      }
    }
  }, [videoAssets])

  // ----- Video ↔ Audio Sync -----
  // Mirrors play/pause + currentTime from the audio store to every pooled
  // video. Per-layer sync mode is resolved here (looking across both
  // `layers` and `draftLayer`), with music_sync winning over loop when
  // any reference asks for it. Drift correction only fires when the gap
  // exceeds 200 ms — setting currentTime every frame would stall the tab.
  useEffect(() => {
    const pool = getPoolEntries()
    if (pool.length === 0) return

    const allLayers = draftLayer ? [...layers, draftLayer] : layers

    const getSyncModeForAsset = (assetId: string): 'loop' | 'music_sync' => {
      let mode: 'loop' | 'music_sync' = 'loop'
      for (const l of allLayers) {
        if (l.type === 'video') {
          const cfg = l.config
          if (cfg.videoAssetId === assetId && cfg.syncMode === 'music_sync') {
            return 'music_sync'
          }
        } else if (l.type === 'shape') {
          const cfg = l.config
          if (
            cfg.fillType === 'video' &&
            cfg.videoAssetId === assetId &&
            cfg.videoSyncMode === 'music_sync'
          ) {
            return 'music_sync'
          }
        } else if (l.type === 'logo') {
          const cfg = l.config
          if (
            cfg.videoAssetId === assetId &&
            cfg.videoSyncMode === 'music_sync'
          ) {
            return 'music_sync'
          }
        } else if (l.type === 'circular' || l.type === 'polygon') {
          const cfg = l.config
          if (
            cfg.videoFillEnabled &&
            cfg.videoFillAssetId === assetId &&
            cfg.videoFillSyncMode === 'music_sync'
          ) {
            return 'music_sync'
          }
        }
      }
      return mode
    }

    // Per-layer playback-rate resolver (only meaningful for standalone
    // VideoLayers in 'loop' mode; container fills always run at 1×).
    const getPlaybackRateForAsset = (assetId: string): number => {
      for (const l of allLayers) {
        if (l.type === 'video' && l.config.videoAssetId === assetId) {
          return l.config.playbackRate ?? 1
        }
      }
      return 1
    }

    for (const [assetId, video] of pool) {
      const mode = getSyncModeForAsset(assetId)

      if (mode === 'music_sync') {
        video.loop = false
        video.playbackRate = 1
        const target = currentTime % (video.duration || 1)
        const drift = Math.abs(video.currentTime - target)
        if (drift > 0.2) {
          try {
            video.currentTime = target
          } catch {
            /* ignore — element might not be ready yet */
          }
        }
      } else {
        video.loop = true
        const rate = getPlaybackRateForAsset(assetId)
        if (Math.abs(video.playbackRate - rate) > 0.01) {
          video.playbackRate = rate
        }
      }

      // Audio routing: only the CHOSEN audio source's element is
      // audible. resolveAnalyserSource collapses every mode into one
      // rule — the active candidate's element is unmuted; everything
      // else stays muted (default):
      //   - Music only          → all videos muted, music plays
      //   - Video only          → that video unmuted, no music
      //   - Music + Video src=music → all videos muted
      //   - Music + Video src=video → the chosen video unmuted,
      //                                music muted by useAudioPlayer
      const analyserSource = resolveAnalyserSource()
      const shouldUnmute =
        analyserSource.isVideo &&
        analyserSource.videoAssetId === assetId
      if (video.muted !== !shouldUnmute) {
        video.muted = !shouldUnmute
      }

      if (isPlaying) {
        if (video.paused) {
          // .play() can reject if blocked by autoplay policy — muted
          // videos almost always work, but we still swallow the rejection.
          video.play().catch(() => {})
        }
      } else if (!video.paused) {
        video.pause()
      }
    }
  }, [
    isPlaying,
    currentTime,
    videoAssets,
    layers,
    draftLayer,
    audioSource,
    videoAudioAssetId,
  ])

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

      // Hard-clear to black each frame so missing background layers
      // don't leave the previous frame's pixels behind. Background
      // layers (if enabled) paint on top of this clear.
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)

      // Iterate enabled layers in z-order (back → front). Background
      // + text layers DON'T require audio data, so the layer loop runs
      // unconditionally; audio-dependent renderers (bars/circular/wave/
      // polygon/particles/frame-pulse) gate themselves on `data`.
      // Draft layer (if any) is merged into the iteration so the user
      // sees a live preview while exploring. It disappears on commit
      // (which moves it into layers[] with the same id, no re-render
      // gap) or on discard.
      const baseLayers: Layer[] = [...layersRef.current]
      if (draftLayerRef.current) baseLayers.push(draftLayerRef.current)
      const enabledLayers = baseLayers
        .filter((l) => l.enabled)
        .sort((a, b) => a.zOrder - b.zOrder || a.createdAt - b.createdAt)

      // Precompute palette for "Sync with visualizer" particle layers:
      // topmost enabled visualizer-type layer's palette wins.
      let visualizerPalette: string[] | undefined
      {
        const topDown = [...enabledLayers].reverse()
        for (const l of topDown) {
          if (
            l.type === 'bars' ||
            l.type === 'circular' ||
            l.type === 'wave' ||
            l.type === 'polygon' ||
            l.type === 'bloom'
          ) {
            if (l.config.palette && l.config.palette.length > 0) {
              visualizerPalette = l.config.palette
              break
            }
          }
        }
      }
      const bassEnergy = data ? data.bass / 255 : 0
      // beatEnergy is the analyzer's beat-detection signal (already
      // normalised ~0–1). drawFrameLayer uses it for the optional
      // colour-lerp / shadow-blur on beats.
      const beatEnergy = data?.beatEnergy ?? 0
      const nowMs = performance.now()
      const editingTextId = useLayerStore.getState().editingTextLayerId

      // Resolve the topmost enabled Logo's position ONCE per frame so
      // every Halo layer with lockToLogo=true can read the same live
      // position. Cheaper than re-scanning per layer; also gives all
      // halos a coherent target if multiple are stacked.
      let logoPosition: { x: number; y: number } | null = null
      for (const l of enabledLayers) {
        if (l.type === 'logo') {
          logoPosition = {
            x: l.config.position.x,
            y: l.config.position.y,
          }
          break
        }
      }

      for (const layer of enabledLayers) {
        // Universal layer opacity: wrap each draw in save/restore so the
        // outer globalAlpha doesn't bleed into the next layer. Multiplies
        // with any renderer-internal opacity (e.g. ShapeLayerConfig
        // .fillOpacity, BackgroundLayerConfig.opacity). Fully transparent
        // layers skip the work entirely.
        const layerOpacity = layer.opacity ?? 1
        if (layerOpacity <= 0) continue
        ctx.save()
        ctx.globalAlpha = layerOpacity

        switch (layer.type) {
          case 'background':
            drawBackgroundLayer(ctx, layer.config, width, height)
            break
          case 'bars':
            if (!data) break
            renderLinearBars(
              ctx,
              data,
              layer.config,
              width,
              height,
              barsHeightsRef.current,
            )
            break
          case 'circular':
            if (!data) break
            renderCircularSpectrum(
              ctx,
              data,
              layer.config,
              width,
              height,
              circularHeightsRef.current,
              cover.logo ? cover.logoSize : undefined,
            )
            break
          case 'wave':
            if (!data) break
            renderWave(ctx, data, layer.config, width, height)
            break
          case 'polygon': {
            if (!data) break
            // Draw the logo INSIDE the polygon shape before the bars
            // so spectrum bars stay visible on top of the logo.
            if (cover.logo) {
              const minDim = Math.min(width, height)
              const baseRadius = Math.min(
                layer.config.radius,
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
                  polygonShape: layer.config.shape,
                  polygonRotation: layer.config.rotation,
                  polygonRadius: baseRadius * logoScale,
                },
                width,
                height,
              )
            }
            renderPolygonSpectrum(
              ctx,
              data,
              layer.config,
              width,
              height,
              polygonHeightsRef.current,
            )
            break
          }
          case 'bloom':
            if (!data) break
            drawBloom(ctx, layer.config, data, width, height)
            break
          case 'shape':
            drawCustomShape(ctx, layer.config, data, width, height)
            break
          case 'video':
            drawVideoLayer(ctx, layer.config, width, height)
            break
          case 'particles':
            drawParticlesForLayer(
              ctx,
              layer.id,
              layer.config,
              width,
              height,
              visualizerPalette,
              data,
              nowMs,
            )
            break
          case 'logo':
            drawLogoLayer(
              ctx,
              cover.logo,
              {
                logoSize: layer.config.logoSize,
                logoCropMode: layer.config.logoCropMode,
                position: layer.config.position,
                videoAssetId: layer.config.videoAssetId ?? null,
                imageSrc: layer.config.imageSrc ?? null,
              },
              width,
              height,
            )
            break
          case 'frame':
            drawFrameLayer(
              ctx,
              layer.config,
              width,
              height,
              bassEnergy,
              beatEnergy,
            )
            break
          case 'halo':
            // logoPosition resolved once per frame above. drawHaloLayer's
            // router applies it when config.lockToLogo is true.
            drawHaloLayer(
              ctx,
              layer.config,
              data ?? ({
                raw: new Uint8Array(0),
                bass: 0,
                mid: 0,
                treble: 0,
                rms: 0,
                peak: 0,
                beatEnergy: 0,
                timeDomain: new Uint8Array(0),
                spectrum: new Float32Array(0),
                spectrumBins: 0,
              } as FrequencyData),
              width,
              height,
              logoPosition,
            )
            break
          case 'text':
            drawTextLayer(
              ctx,
              layer.config,
              width,
              height,
              editingTextId === layer.id,
            )
            break
          case 'cinematic':
            // Post-processing — read no audio, write over everything
            // beneath. Renderer caches its vignette gradient + noise
            // tiles internally so per-frame cost is one fillRect + a
            // handful of drawImage calls.
            drawCinematic(ctx, layer.config, width, height)
            break
        }
        ctx.restore()
      }

      if (data && cfg.framePulse.enabled) {
        renderFramePulse(ctx, data, cfg.framePulse, width, height)
      }

      // Cover-art overlay (separate from Logo layers — driven by the
      // existing CoverArtUploader; still global for now).
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
      }

      // (Text overlay is now handled per-layer inside the layer loop
      // via the 'text' case — global drawTextOverlay call removed.)

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
