import type { HaloLayerConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { resolvePalette } from '@/lib/colorPalette'

/**
 * Spectrum Crown — N bars arrayed radially around the centre,
 * standing OUT from the baseRadius circle. Classic music-visualiser
 * silhouette: every bin gets its own bar, fanned around a central
 * focal point. Two thin ring strokes (inner + outer at peak) frame
 * the bars visually.
 */
export function drawHaloSpectrumCrown(
  ctx: CanvasRenderingContext2D,
  config: HaloLayerConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const cx = width * config.offsetX
  const cy = height * config.offsetY

  const barCount = Math.max(32, Math.min(128, config.barCount ?? 64))
  const spectrum = data.spectrum
  const spectrumBins = data.spectrumBins

  const bassEnergy = (data.bass / 255) * config.bassSensitivity
  const trebleEnergy = (data.treble / 255) * config.trebleSensitivity
  const beat = Math.min(1, data.beatEnergy)

  const palette = resolvePalette(
    config.palette,
    config.colorStart,
    config.colorEnd,
  )

  const innerR = config.baseRadius
  // Max bar height — 80% of base radius at peak, scaled by treble
  // sensitivity (high-end is the visual driver here).
  const maxBarH = innerR * (0.6 + trebleEnergy * 0.4)
  // Bar width set so adjacent bars are visually distinct (~30% gap).
  const circumference = 2 * Math.PI * innerR
  const barWidth = (circumference / barCount) * 0.7

  const binStep = Math.max(1, Math.floor(spectrumBins / barCount))

  const rotRad = (config.rotation * Math.PI) / 180

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotRad)

  // Inner ring — subtle anchor stroke at baseRadius.
  if (config.glowEnabled && config.glowIntensity > 0) {
    ctx.shadowColor = palette[0] ?? '#fff'
    ctx.shadowBlur = config.glowIntensity * 0.4
  }
  ctx.strokeStyle = palette[0] ?? '#fff'
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.arc(0, 0, innerR, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  // Reset shadow so per-bar glow can re-set differently.
  ctx.shadowBlur = 0

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
    const sIdx = (i * binStep) % spectrumBins
    const bandEnergy = spectrum[sIdx] ?? 0
    // Beat punch boosts every bar uniformly so peaks are dramatic.
    const barH = bandEnergy * maxBarH * (1 + beat * 0.3)
    if (barH < 0.5) continue

    // Bar colour — cycle palette around the ring; gradient stop
    // determined by progress fraction.
    const t = i / barCount
    const colorIdx = Math.floor(t * palette.length)
    ctx.fillStyle = palette[colorIdx % palette.length]
    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = ctx.fillStyle as string
      ctx.shadowBlur = config.glowIntensity * (0.4 + bandEnergy * 0.6)
    }

    // Translate-rotate to position each bar tangentially. Bars
    // grow OUTWARD from baseRadius along the radial axis.
    ctx.save()
    ctx.rotate(angle)
    ctx.fillRect(-barWidth / 2, innerR, barWidth, barH)
    ctx.restore()
  }

  // Outer ring — drawn only when bass is energetic, ghosting the
  // peak amplitude. Subtle hint of the crown's outer envelope.
  if (bassEnergy > 0.15) {
    ctx.strokeStyle = palette[palette.length - 1] ?? '#fff'
    ctx.lineWidth = 1
    ctx.globalAlpha = bassEnergy * 0.4
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.arc(0, 0, innerR + maxBarH * 0.5, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}
