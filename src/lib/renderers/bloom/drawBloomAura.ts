import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { resolvePalette } from '@/lib/colorPalette'
import { drawBloomFill } from './fillHelpers'

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
  resolvedImageFillSrc?: string | null,
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

  // Pre-compute every circle's geometry in one pass so we can build
  // a union Path2D for the asset clip, then re-iterate to draw with
  // additive composition. The two loops cost negligibly more than
  // the one — six circles — and the rewrite lets the asset fill
  // honour the cloud's exact form (union of arcs) instead of a
  // bounding box.
  interface CircleParams { dx: number; dy: number; r: number; energy: number; color: string }
  const circles: CircleParams[] = []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < CIRCLE_COUNT; i++) {
    const band = i < 2 ? bassEnergy : i < 4 ? midEnergy : trebleEnergy
    const energy = band + beatPunch
    const breath = 0.85 + 0.15 * Math.sin(tSec * 0.5 + i)
    const r = baseR * (breath + energy * 0.45)
    const driftAmp = baseR * 0.15
    const dx =
      seeds.offsets[i * 2] * baseR +
      Math.cos(tSec * seeds.driftFreqs[i] * Math.PI + seeds.driftPhases[i]) *
        driftAmp
    const dy =
      seeds.offsets[i * 2 + 1] * baseR +
      Math.sin(tSec * seeds.driftFreqs[i] * Math.PI + seeds.driftPhases[i]) *
        driftAmp
    const color = palette[i % palette.length]
    circles.push({ dx, dy, r, energy, color })
    // Bbox tracks the union — used by drawBloomFill for the
    // cover/contain fit math.
    if (dx - r < minX) minX = dx - r
    if (dx + r > maxX) maxX = dx + r
    if (dy - r < minY) minY = dy - r
    if (dy + r > maxY) maxY = dy + r
  }

  ctx.save()
  ctx.translate(cx, cy)

  // Asset fill — clipped to the union of all six arcs (the cloud's
  // exact silhouette). Drawn WITHOUT additive composition so the
  // video shows its real colours; the additive circles then layer
  // on top with 'lighter' to add the aura glow.
  if (resolvedImageFillSrc || config.videoFillEnabled || config.imageFillEnabled) {
    const unionPath = new Path2D()
    for (const c of circles) {
      // Each arc on a fresh sub-path — Path2D's default winding rule
      // unions them by treating them all as fills.
      unionPath.moveTo(c.dx + c.r, c.dy)
      unionPath.arc(c.dx, c.dy, Math.max(2, c.r), 0, Math.PI * 2)
    }
    drawBloomFill(
      ctx,
      config,
      unionPath,
      { minX, minY, maxX, maxY },
      resolvedImageFillSrc,
    )
  }

  // Additive aura pass — unchanged from the original render. Layers
  // the coloured glow over whatever is below (asset fill or empty).
  ctx.globalCompositeOperation = 'lighter'
  for (const c of circles) {
    ctx.fillStyle = c.color
    ctx.globalAlpha = Math.min(0.3, 0.18 + c.energy * 0.12)
    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = c.color
      ctx.shadowBlur = config.glowIntensity * (0.6 + c.energy * 0.4)
    }
    ctx.beginPath()
    ctx.arc(c.dx, c.dy, Math.max(2, c.r), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
