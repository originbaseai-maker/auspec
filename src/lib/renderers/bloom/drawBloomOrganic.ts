import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { firstColor, lastColor } from '@/lib/colorPalette'
import { bboxOfPoints, drawBloomFill } from './fillHelpers'

/**
 * Per-config phase + frequency seeds for the breathing offsets. Seeded
 * once per config object so the shape's wobble pattern stays stable
 * across frames (otherwise it'd jitter from random per-frame seeds).
 */
const seedsByConfig = new WeakMap<
  BloomConfig,
  { phases: Float32Array; freqs: Float32Array }
>()

const POINT_COUNT = 14

function ensureSeeds(
  config: BloomConfig,
): { phases: Float32Array; freqs: Float32Array } {
  let s = seedsByConfig.get(config)
  if (!s) {
    const phases = new Float32Array(POINT_COUNT)
    const freqs = new Float32Array(POINT_COUNT)
    for (let i = 0; i < POINT_COUNT; i++) {
      phases[i] = Math.random() * Math.PI * 2
      // Frequencies sit between 0.4 and 1.4 Hz — slow breathing rhythm.
      freqs[i] = 0.4 + Math.random()
    }
    s = { phases, freqs }
    seedsByConfig.set(config, s)
  }
  return s
}

/**
 * Organic Pulse — soft, breathing closed blob with smooth bezier edges.
 * Each of 14 control points around the centre wobbles on its own slow
 * sin wave; bass energy adds a uniform outward push. Filled with a
 * radial gradient that fades from the first palette colour at the
 * centre to fully transparent at the edge.
 */
export function drawBloomOrganic(
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  data: FrequencyData,
  width: number,
  height: number,
  resolvedImageFillSrc?: string | null,
): void {
  const cx = width * (config.offsetX ?? 0.5)
  const cy = height * (config.offsetY ?? 0.5)

  const { phases, freqs } = ensureSeeds(config)
  const tSec = performance.now() / 1000

  const bassEnergy = (data.bass / 255) * (config.bassSensitivity ?? 1)
  const midEnergy = (data.mid / 255) * (config.midSensitivity ?? 1)
  const trebleEnergy = (data.treble / 255) * (config.trebleSensitivity ?? 1)
  const avgEnergy = (bassEnergy + midEnergy + trebleEnergy) / 3

  const baseRadius = config.baseRadius
  // Amplitude of each point's wobble — ~25% of base radius.
  const wobbleAmp = baseRadius * 0.25
  // Bass adds a uniform outward push so the whole blob "inhales" on beats.
  const bassPush = bassEnergy * baseRadius * (config.bassPulse + 0.3)

  const xs = new Float32Array(POINT_COUNT)
  const ys = new Float32Array(POINT_COUNT)
  let maxR = 0
  for (let i = 0; i < POINT_COUNT; i++) {
    const angle = (i / POINT_COUNT) * Math.PI * 2
    const wobble = Math.sin(tSec * freqs[i] * Math.PI + phases[i]) * wobbleAmp
    const r = baseRadius + wobble + bassPush
    if (r > maxR) maxR = r
    xs[i] = Math.cos(angle) * r
    ys[i] = Math.sin(angle) * r
  }

  const centerColor = firstColor(config.palette, config.colorStart)
  const edgeColor = lastColor(config.palette, config.colorEnd)

  ctx.save()
  ctx.translate(cx, cy)

  // Radial gradient from the first palette colour at the centre to
  // transparent at the (rounded) outer edge. maxR + a little headroom
  // so the gradient doesn't clip the bezier overshoot.
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR * 1.1)
  grad.addColorStop(0, centerColor)
  // Mid-gradient brings in the palette's end colour at low alpha so
  // multi-stop palettes show through, not just the first stop.
  grad.addColorStop(0.5, hexToRgba(edgeColor, 0.35))
  grad.addColorStop(1, hexToRgba(edgeColor, 0))

  if (config.glowEnabled && config.glowIntensity > 0) {
    // Glow scales with overall energy so the whole shape "lights up"
    // on loud passages.
    ctx.shadowColor = centerColor
    ctx.shadowBlur = config.glowIntensity * (0.5 + avgEnergy * 0.5)
  }

  // Build path on a Path2D so we can clip+fill from the asset AND
  // re-use the same shape for the gradient fill / glow stroke
  // afterwards without rebuilding.
  const path = new Path2D()
  path.moveTo(
    (xs[0] + xs[POINT_COUNT - 1]) / 2,
    (ys[0] + ys[POINT_COUNT - 1]) / 2,
  )
  for (let i = 0; i < POINT_COUNT; i++) {
    const next = (i + 1) % POINT_COUNT
    const midX = (xs[i] + xs[next]) / 2
    const midY = (ys[i] + ys[next]) / 2
    path.quadraticCurveTo(xs[i], ys[i], midX, midY)
  }
  path.closePath()

  // Asset fill takes over when configured — it replaces the radial
  // gradient (rather than compositing on top, which would tint the
  // whole video purple). The glow shadow stays so the edge keeps
  // its bloom.
  const bbox = bboxOfPoints(xs, ys, POINT_COUNT)
  const assetFilled = drawBloomFill(
    ctx,
    config,
    path,
    bbox,
    resolvedImageFillSrc,
  )
  if (!assetFilled) {
    ctx.fillStyle = grad
    ctx.fill(path)
  }

  ctx.restore()
}

/** #RRGGBB → rgba(r,g,b,a) helper. Tiny, kept inline to avoid extra deps. */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return `rgba(0,0,0,${alpha})`
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return `rgba(${r},${g},${b},${alpha})`
}
