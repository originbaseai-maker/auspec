import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { resolvePalette } from '@/lib/colorPalette'

const rotationByConfig = new WeakMap<
  BloomConfig,
  { rotation: number; lastTime: number }
>()

/**
 * Multi-Ring — N concentric rings, each stroked on its own band.
 * Outer rings rotate one direction, inner rings counter-rotate
 * (alternating by index parity) so the composition feels alive
 * without spinning as a single rigid disc.
 *
 * Two colour modes:
 *   - Themed (default): each ring picks a palette colour, cycling
 *     by index — clean, brand-aligned
 *   - Rainbow (rainbow: true): hue spread from red (0°) at the
 *     centre to violet (270°) at the outer ring — Specterr's
 *     "spectrum rings" look
 */
export function drawBloomMultiRing(
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const cx = width * (config.offsetX ?? 0.5)
  const cy = height * (config.offsetY ?? 0.5)

  const ringCount = Math.max(3, Math.min(7, config.ringCount ?? 5))

  // Common rotation accumulator — each ring multiplies this by its
  // own direction sign + speed scale to get its individual rotation.
  const now = performance.now()
  let rotState = rotationByConfig.get(config)
  if (!rotState) {
    rotState = { rotation: 0, lastTime: now }
    rotationByConfig.set(config, rotState)
  }
  const dtSec = Math.min(0.1, (now - rotState.lastTime) / 1000)
  rotState.rotation += (config.variantRotationSpeed ?? 0.5) * dtSec * 360
  rotState.lastTime = now

  const bassEnergy = (data.bass / 255) * (config.bassSensitivity ?? 1)
  const midEnergy = (data.mid / 255) * (config.midSensitivity ?? 1)
  const trebleEnergy = (data.treble / 255) * (config.trebleSensitivity ?? 1)
  const bands = [bassEnergy, midEnergy, trebleEnergy]

  const beat = Math.min(1, data.beatEnergy)
  const baseR = config.baseRadius
  // Ring radii spaced evenly between 0.3 · baseR and 1.2 · baseR.
  const minR = baseR * 0.3
  const maxR = baseR * 1.2

  const themedPalette = resolvePalette(
    config.palette,
    config.colorStart,
    config.colorEnd,
  )
  const rainbow = config.rainbow ?? false

  ctx.save()
  ctx.translate(cx, cy)

  for (let i = 0; i < ringCount; i++) {
    const t = ringCount > 1 ? i / (ringCount - 1) : 0
    // Even spacing minR → maxR. Bass adds an outward "breath" to the
    // whole stack so all rings expand together on heavy hits.
    const r = (minR + (maxR - minR) * t) * (1 + bassEnergy * config.bassPulse)

    // Each ring picks a band by index — cycles bass/mid/treble.
    const band = bands[i % bands.length]
    // Stroke thickness scales with that band's energy. Beat adds a
    // global thickness boost so loud hits beef up every ring.
    const thickness = Math.max(
      1,
      config.lineWidth + band * 6 * (1 + beat * 0.5),
    )

    // Colour: rainbow vs themed
    let color: string
    if (rainbow) {
      // Hue spread from red (0°) at centre to violet (270°) at outer
      // ring. Stays inside the visible spectrum (no full 360° wrap).
      const hue = t * 270
      color = `hsl(${hue}, 85%, 60%)`
    } else {
      color = themedPalette[i % themedPalette.length]
    }

    // Per-ring rotation: even rings rotate +, odd rings rotate − so
    // adjacent rings counter-spin. Outer rings rotate faster than
    // inner ones (·(1 + t)) — more visual interest.
    const dirSign = i % 2 === 0 ? 1 : -1
    const ringRot = ((rotState.rotation * dirSign * (1 + t)) * Math.PI) / 180

    ctx.save()
    ctx.rotate(ringRot)
    ctx.strokeStyle = color
    ctx.lineWidth = thickness
    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = color
      ctx.shadowBlur = config.glowIntensity * (0.4 + band * 0.6)
    }
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  ctx.restore()
}
