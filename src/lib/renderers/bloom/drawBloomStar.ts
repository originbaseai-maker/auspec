import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { firstColor, lastColor } from '@/lib/colorPalette'
import {
  applyBandSensitivityByFreq,
  spectrumIdxToFreq,
} from '@/lib/audio/logScaleBins'
import { drawBloomFill } from './fillHelpers'

const rotationByConfig = new WeakMap<
  BloomConfig,
  { rotation: number; lastTime: number }
>()

/**
 * Geometric Star — rotating polygon star with audio-reactive spikes.
 * N spikes alternate inner radius (steady) ↔ outer radius (audio-
 * reactive). Outer-radius for spike i pulls from frequency band
 * (i mod numBands) so each spike dances on its own band — gives the
 * "spectrum splayed around a centre" feel.
 *
 * Stroke-only by default — matches the Specterr "wireframe star"
 * look. Sharp angular silhouette (no bezier smoothing).
 */
export function drawBloomStar(
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  data: FrequencyData,
  width: number,
  height: number,
  resolvedImageFillSrc?: string | null,
): void {
  const cx = width * (config.offsetX ?? 0.5)
  const cy = height * (config.offsetY ?? 0.5)

  const spikes = Math.max(4, Math.min(12, config.starPoints ?? 6))

  const spectrum = data.spectrum
  const spectrumBins = data.spectrumBins

  // Slow continuous rotation.
  const now = performance.now()
  let rotState = rotationByConfig.get(config)
  if (!rotState) {
    rotState = { rotation: 0, lastTime: now }
    rotationByConfig.set(config, rotState)
  }
  const dtSec = Math.min(0.1, (now - rotState.lastTime) / 1000)
  rotState.rotation += (config.variantRotationSpeed ?? 0.5) * dtSec * 360
  rotState.lastTime = now
  const rotRad = (rotState.rotation * Math.PI) / 180

  const bassEnergy = (data.bass / 255) * (config.bassSensitivity ?? 1)
  const beat = Math.min(1, data.beatEnergy)

  const baseR = config.baseRadius * (1 + bassEnergy * config.bassPulse)
  const innerR = baseR * 0.5
  // Outer radius range: baseR (silent) → baseR · 2 (peak). amplitudeScale
  // tunes how aggressively spikes shoot out.
  const outerRange = baseR * 1.0 * config.amplitudeScale

  // Sample one log-scaled bin per spike, spread evenly across the
  // spectrum. Log-binning means each spike now corresponds to a
  // similar perceptual octave range rather than a fixed Hz slice —
  // the star "feels" more even across the music.
  const sampleStep = Math.max(1, Math.floor(spectrumBins / spikes))

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotRad)

  const strokeColor = firstColor(config.palette, config.colorStart)
  const beatColor = lastColor(config.palette, config.colorEnd)

  // Beat-driven stroke colour shift: lerp from base colour to the
  // palette's end stop when a beat lands.
  ctx.strokeStyle = beat > 0.6 ? beatColor : strokeColor
  ctx.lineWidth = Math.max(1, config.lineWidth)
  ctx.lineJoin = 'miter'
  ctx.miterLimit = 4

  if (config.glowEnabled && config.glowIntensity > 0) {
    ctx.shadowColor = strokeColor
    ctx.shadowBlur = config.glowIntensity * (0.5 + beat * 0.5)
  }

  // Build the star path on a Path2D once + track bbox in the same
  // pass — used for both the fill clip and the existing stroke.
  const path = new Path2D()
  const totalVerts = spikes * 2
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let v = 0; v < totalVerts; v++) {
    const isOuter = v % 2 === 0
    const spikeIdx = v >> 1
    const angle = (v / totalVerts) * Math.PI * 2 - Math.PI / 2

    let r: number
    if (isOuter) {
      const sIdx = (spikeIdx * sampleStep) % spectrumBins
      const freq = spectrumIdxToFreq(sIdx, spectrumBins)
      const energy = applyBandSensitivityByFreq(
        spectrum[sIdx] ?? 0,
        freq,
        config.bassSensitivity ?? 1,
        config.midSensitivity ?? 1,
        config.trebleSensitivity ?? 1,
      )
      r = baseR + energy * outerRange
    } else {
      r = innerR
    }
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (v === 0) path.moveTo(x, y)
    else path.lineTo(x, y)
  }
  path.closePath()

  // FILL — drawn before the stroke so the glowing edge survives.
  drawBloomFill(
    ctx,
    config,
    path,
    { minX, minY, maxX, maxY },
    resolvedImageFillSrc,
  )

  // STROKE — unchanged behaviour, takes the Path2D directly.
  ctx.stroke(path)

  ctx.restore()
}
