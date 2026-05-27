import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { resolvePalette } from '@/lib/colorPalette'

const CIRCLE_COUNT = 6

/**
 * Per-config drift seeds so the blob centres don't jitter randomly
 * each frame. Random fixed offsets + per-circle drift phase and
 * frequency.
 */
const seedsByConfig = new WeakMap<
  BloomConfig,
  {
    offsets: Float32Array // x0, y0, x1, y1, … (2 per circle)
    driftPhases: Float32Array
    driftFreqs: Float32Array
  }
>()

function ensureSeeds(config: BloomConfig) {
  let s = seedsByConfig.get(config)
  if (!s) {
    const offsets = new Float32Array(CIRCLE_COUNT * 2)
    const driftPhases = new Float32Array(CIRCLE_COUNT)
    const driftFreqs = new Float32Array(CIRCLE_COUNT)
    for (let i = 0; i < CIRCLE_COUNT; i++) {
      // Initial offset within ±35% of base radius so circles cluster
      // around the centre without coinciding exactly.
      offsets[i * 2] = (Math.random() - 0.5) * 0.7
      offsets[i * 2 + 1] = (Math.random() - 0.5) * 0.7
      driftPhases[i] = Math.random() * Math.PI * 2
      // Drift between 0.1 and 0.35 Hz — slow, "cloud floating" pace.
      driftFreqs[i] = 0.1 + Math.random() * 0.25
    }
    s = { offsets, driftPhases, driftFreqs }
    seedsByConfig.set(config, s)
  }
  return s
}

/**
 * Aura Cloud — 6 overlapping translucent circles forming a diffuse
 * cloud. Each circle's radius pulses on a different band (bass for
 * the inner two, mid for the middle two, treble for the outer two)
 * and slowly drifts around the centre on its own sine.
 *
 * Uses additive composition (globalCompositeOperation: 'lighter')
 * so overlapping regions brighten — that's what creates the cloud
 * feel. Outer halo via large shadow blur.
 */
export function drawBloomAura(
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const cx = width * (config.offsetX ?? 0.5)
  const cy = height * (config.offsetY ?? 0.5)

  const seeds = ensureSeeds(config)
  const tSec = performance.now() / 1000

  const bassEnergy = (data.bass / 255) * (config.bassSensitivity ?? 1)
  const midEnergy = (data.mid / 255) * (config.midSensitivity ?? 1)
  const trebleEnergy = (data.treble / 255) * (config.trebleSensitivity ?? 1)
  const beatPunch = Math.min(1, data.beatEnergy) * 0.2

  const palette = resolvePalette(
    config.palette,
    config.colorStart,
    config.colorEnd,
  )

  const baseR = config.baseRadius

  ctx.save()
  ctx.translate(cx, cy)
  ctx.globalCompositeOperation = 'lighter'

  for (let i = 0; i < CIRCLE_COUNT; i++) {
    // Bass for inner two (0,1), mid for middle (2,3), treble for
    // outer (4,5). Adds a beat-driven punch to all so loud hits
    // bloom the whole cloud.
    const band = i < 2 ? bassEnergy : i < 4 ? midEnergy : trebleEnergy
    const energy = band + beatPunch

    // Radius cycles between ~70% and ~130% of base, plus energy lift.
    const breath = 0.85 + 0.15 * Math.sin(tSec * 0.5 + i)
    const r = baseR * (breath + energy * 0.45)

    // Drift position around the seeded base offset.
    const driftAmp = baseR * 0.15
    const dx =
      seeds.offsets[i * 2] * baseR +
      Math.cos(tSec * seeds.driftFreqs[i] * Math.PI + seeds.driftPhases[i]) *
        driftAmp
    const dy =
      seeds.offsets[i * 2 + 1] * baseR +
      Math.sin(tSec * seeds.driftFreqs[i] * Math.PI + seeds.driftPhases[i]) *
        driftAmp

    // Cycle through palette so each circle gets a different colour.
    const color = palette[i % palette.length]
    ctx.fillStyle = color
    // Per-circle alpha kept low (≤ 0.3) so additive blending stays
    // legible — too high and overlaps blow out to white.
    ctx.globalAlpha = Math.min(0.3, 0.18 + energy * 0.12)

    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = color
      ctx.shadowBlur = config.glowIntensity * (0.6 + energy * 0.4)
    }

    ctx.beginPath()
    ctx.arc(dx, dy, Math.max(2, r), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
