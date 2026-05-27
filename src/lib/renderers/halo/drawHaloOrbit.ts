import type { HaloLayerConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { resolvePalette } from '@/lib/colorPalette'

/**
 * Per-config speed multipliers so each orbital particle has a
 * distinct cadence — some orbit faster than others. Seeded once
 * per config so the variety stays stable across frames.
 */
const seedsByConfig = new WeakMap<
  HaloLayerConfig,
  { speedMul: Float32Array; radiusJitter: Float32Array }
>()

function ensureSeeds(
  config: HaloLayerConfig,
  count: number,
): { speedMul: Float32Array; radiusJitter: Float32Array } {
  let s = seedsByConfig.get(config)
  if (!s || s.speedMul.length !== count) {
    const speedMul = new Float32Array(count)
    const radiusJitter = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // 0.7–1.4× — gentle spread; too much variety reads as chaotic
      speedMul[i] = 0.7 + Math.random() * 0.7
      // ±15% of base radius — particles orbit on slightly different
      // shells, giving depth.
      radiusJitter[i] = (Math.random() - 0.5) * 0.3
    }
    s = { speedMul, radiusJitter }
    seedsByConfig.set(config, s)
  }
  return s
}

/**
 * Orbit — N particles travelling on the baseRadius ring. Each has
 * its own speed multiplier (seeded) and a slightly jittered radius
 * so the ring reads as a thick "belt" of orbiting bodies rather
 * than a perfectly even rotation. Particle size pulses on beats.
 *
 * Each particle has a fading trail rendered as a short arc of the
 * orbital path — gives motion blur without sub-frame state.
 */
export function drawHaloOrbit(
  ctx: CanvasRenderingContext2D,
  config: HaloLayerConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const cx = width * config.offsetX
  const cy = height * config.offsetY

  const count = Math.max(6, Math.min(30, config.orbitCount ?? 16))
  const orbitSpeed = config.orbitSpeed ?? 0.4
  const seeds = ensureSeeds(config, count)
  const tSec = performance.now() / 1000

  const bassEnergy = (data.bass / 255) * config.bassSensitivity
  const trebleEnergy = (data.treble / 255) * config.trebleSensitivity
  const beat = Math.min(1, data.beatEnergy)

  const palette = resolvePalette(
    config.palette,
    config.colorStart,
    config.colorEnd,
  )

  const baseR = config.baseRadius
  const rotRad = (config.rotation * Math.PI) / 180

  // Particle radius — bigger at peak bass + beat hit + treble adds
  // a subtle "twinkle" on high-end energy.
  const particleR = 3 + bassEnergy * 4 + beat * 5 + trebleEnergy * 2

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotRad)

  for (let i = 0; i < count; i++) {
    // Each particle's angular position. Speed multiplier varies so
    // some particles overtake others — the ring rotates non-rigidly.
    const angle =
      tSec * orbitSpeed * seeds.speedMul[i] * Math.PI * 2 +
      (i / count) * Math.PI * 2
    const r = baseR * (1 + seeds.radiusJitter[i])
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r

    const color = palette[i % palette.length]

    // Trail — a short arc of the orbital path behind the particle.
    // Drawn first so the particle paints over its head; alpha falls
    // off along the arc to suggest motion blur.
    const trailArc = 0.45 * Math.sign(orbitSpeed) // ~25° behind
    if (trailArc !== 0) {
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(1, particleR * 0.7)
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.35
      if (config.glowEnabled && config.glowIntensity > 0) {
        ctx.shadowColor = color
        ctx.shadowBlur = config.glowIntensity * 0.3
      }
      ctx.beginPath()
      // arc(cx, cy, r, startAngle, endAngle, counterClockwise)
      ctx.arc(0, 0, r, angle - trailArc, angle, trailArc < 0)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Particle body — solid circle with optional glow.
    ctx.fillStyle = color
    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = color
      ctx.shadowBlur = config.glowIntensity * (0.5 + beat * 0.5)
    }
    ctx.beginPath()
    ctx.arc(x, y, Math.max(1, particleR), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
