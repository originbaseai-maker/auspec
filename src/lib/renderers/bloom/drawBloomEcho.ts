import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { colorFromPalette, firstColor } from '@/lib/colorPalette'

const rotationByConfig = new WeakMap<
  BloomConfig,
  { rotation: number; lastTime: number }
>()

/**
 * Mirrored Echo — N concentric copies of a base shape, expanding
 * outward, plus a vertical mirror so the silhouette reads as the
 * "cat ears" / Specterr stacked-spheres look. Outer echoes punch
 * outward on beat hits (instant scale spike + alpha flash).
 *
 * Each echo is drawn TWICE: once at the centre, once mirrored
 * above/below by `mirrorOffset` (≈ 0.6× baseRadius) — that vertical
 * doubling is what gives this variant its signature shape.
 */
export function drawBloomEcho(
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const cx = width * (config.offsetX ?? 0.5)
  const cy = height * (config.offsetY ?? 0.5)

  const echoCount = Math.max(2, Math.min(6, config.mirrorEchoCount ?? 4))
  const shape = config.echoShape ?? 'circle'

  const bassEnergy = (data.bass / 255) * (config.bassSensitivity ?? 1)
  const midEnergy = (data.mid / 255) * (config.midSensitivity ?? 1)
  const beat = Math.min(1, data.beatEnergy)

  // Slow rotation (configurable rev/sec → degrees/sec ×360).
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

  const baseR = config.baseRadius * (1 + bassEnergy * config.bassPulse)
  // Beat punch — adds an extra scale spike that decays through echoes
  // (outermost ring gets the strongest punch, like ripples).
  const beatPunch = beat * 0.25

  // Vertical mirror offset — separates the upper and lower silhouette
  // copies enough to read as two clusters, not one overlapping blob.
  const mirrorOffset = baseR * 0.6

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotRad)

  for (let e = echoCount - 1; e >= 0; e--) {
    const t = echoCount > 1 ? e / (echoCount - 1) : 0
    // Scale grows linearly outward; outer echoes get extra beat punch.
    const scale = 1 + t * 1.5 + beatPunch * t
    // Alpha falls off geometrically so outer echoes ghost rather than
    // compete with the core shape.
    const alpha = Math.pow(0.7, e) * (1 + beat * 0.3)
    const r = baseR * 0.6 * scale

    const color =
      e === 0
        ? firstColor(config.palette, config.colorStart)
        : colorFromPalette(
            config.palette,
            config.colorStart,
            config.colorEnd,
            t,
          )

    ctx.globalAlpha = Math.min(1, alpha)
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = Math.max(1, config.lineWidth * (1 + midEnergy * 0.5))

    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = color
      ctx.shadowBlur = config.glowIntensity * (0.4 + bassEnergy * 0.6)
    }

    // Upper + lower mirror copies. Inner echo (e=0) skips the mirror
    // so the centre stays a single focal point.
    const yOffsets = e === 0 ? [0] : [-mirrorOffset * t, mirrorOffset * t]
    for (const yOff of yOffsets) {
      ctx.beginPath()
      if (shape === 'circle') {
        ctx.arc(0, yOff, r, 0, Math.PI * 2)
      } else {
        // Hexagon as the polygon default — clean silhouette, 6 sides.
        const sides = 6
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2 - Math.PI / 2
          const x = Math.cos(a) * r
          const y = Math.sin(a) * r + yOff
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
      }
      // Inner echo gets a soft fill; outer echoes stroke-only so the
      // expanding-ripple feel reads.
      if (e === 0) ctx.fill()
      else ctx.stroke()
    }
  }

  ctx.restore()
}
