import type { HaloLayerConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { resolvePalette } from '@/lib/colorPalette'

const rotationByConfig = new WeakMap<
  HaloLayerConfig,
  { rotation: number; lastTime: number }
>()

/**
 * Radial Burst — N rays at equal angles around the center. Each
 * ray's outer radius pulls from a frequency bin so individual rays
 * dance on different bands. Slow continuous rotation drift.
 * On beat hits, all rays spike outward by an additional 30%.
 */
export function drawHaloRadialBurst(
  ctx: CanvasRenderingContext2D,
  config: HaloLayerConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const cx = width * config.offsetX
  const cy = height * config.offsetY

  const rayCount = Math.max(12, Math.min(48, config.rayCount ?? 24))
  const raw = data.raw
  const totalBins = raw.length

  const bassEnergy = (data.bass / 255) * config.bassSensitivity
  const beat = Math.min(1, data.beatEnergy)
  const beatPunch = beat > 0.6 ? 0.3 : 0

  // Slow rotation drift — 6 deg/sec — gives the burst a "spinning
  // sun" feel without going dizzy.
  const now = performance.now()
  let rotState = rotationByConfig.get(config)
  if (!rotState) {
    rotState = { rotation: 0, lastTime: now }
    rotationByConfig.set(config, rotState)
  }
  const dtSec = Math.min(0.1, (now - rotState.lastTime) / 1000)
  rotState.rotation += 6 * dtSec
  rotState.lastTime = now
  const baseAngleRad =
    ((config.rotation + rotState.rotation) * Math.PI) / 180

  const palette = resolvePalette(
    config.palette,
    config.colorStart,
    config.colorEnd,
  )

  const innerR = config.baseRadius
  // One bin per ray, evenly spread across the spectrum.
  const binStep = Math.max(1, Math.floor(totalBins / rayCount))

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(baseAngleRad)
  ctx.lineCap = 'round'
  ctx.lineWidth = 2 + bassEnergy * 2

  if (config.glowEnabled && config.glowIntensity > 0) {
    ctx.shadowColor = palette[0] ?? '#fff'
    ctx.shadowBlur = config.glowIntensity * (0.5 + beat * 0.5)
  }

  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2
    const binIdx = (i * binStep) % totalBins
    const bandEnergy = (raw[binIdx] ?? 0) / 255
    // Outer radius: 1.5× base at silence → up to ~3× at full peak.
    const scale = 1.5 + bandEnergy * 2 + bassEnergy * 0.5 + beatPunch
    const outerR = innerR * scale

    ctx.strokeStyle = palette[i % palette.length]
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR)
    ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR)
    ctx.stroke()
  }

  ctx.restore()
}
