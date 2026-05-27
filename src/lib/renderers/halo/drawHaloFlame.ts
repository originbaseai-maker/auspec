import type { HaloLayerConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { firstColor, lastColor } from '@/lib/colorPalette'

/**
 * Per-config flicker seeds: each flame tongue gets a stable random
 * phase + frequency so the flicker pattern doesn't jitter per frame.
 */
const seedsByConfig = new WeakMap<
  HaloLayerConfig,
  { phases: Float32Array; freqs: Float32Array }
>()

function ensureSeeds(
  config: HaloLayerConfig,
  count: number,
): { phases: Float32Array; freqs: Float32Array } {
  let s = seedsByConfig.get(config)
  if (!s || s.phases.length !== count) {
    const phases = new Float32Array(count)
    const freqs = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      phases[i] = Math.random() * Math.PI * 2
      // 2–6 Hz — fast enough to read as flickering, not jittering.
      freqs[i] = 2 + Math.random() * 4
    }
    s = { phases, freqs }
    seedsByConfig.set(config, s)
  }
  return s
}

/**
 * Flame — N curved triangular tongues emanating from the
 * baseRadius circle. Each tongue is a closed path with two side
 * curves meeting at a sharp tip. Length pulses on its own bin
 * energy plus a per-tongue sin flicker. Lit with a hot→tip
 * gradient and rendered with composite-op 'lighter' for additive
 * heat where adjacent tongues overlap.
 *
 * flameDirection:
 *   - 'all' — tongues radiate outward (default)
 *   - 'up'  — all tongues point upward (90° = north)
 */
export function drawHaloFlame(
  ctx: CanvasRenderingContext2D,
  config: HaloLayerConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const cx = width * config.offsetX
  const cy = height * config.offsetY

  const count = Math.max(6, Math.min(24, config.flameCount ?? 12))
  const dir = config.flameDirection ?? 'all'
  const raw = data.raw
  const totalBins = raw.length

  const bassEnergy = (data.bass / 255) * config.bassSensitivity
  const beat = Math.min(1, data.beatEnergy)

  const seeds = ensureSeeds(config, count)
  const tSec = performance.now() / 1000
  const rotRad = (config.rotation * Math.PI) / 180

  const baseR = config.baseRadius
  const baseLength = baseR * 0.7
  const binStep = Math.max(1, Math.floor(totalBins / count))

  const hotColor = firstColor(config.palette, config.colorStart)
  const tipColor = lastColor(config.palette, config.colorEnd)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotRad)
  // Additive composition so overlapping tongues brighten — that's
  // what gives the flame its "hot core" feel.
  ctx.globalCompositeOperation = 'lighter'

  for (let i = 0; i < count; i++) {
    const baseAngle =
      dir === 'up'
        ? -Math.PI / 2
        : (i / count) * Math.PI * 2 - Math.PI / 2
    // Each tongue's anchor on the base ring. For 'up' mode all anchors
    // sit at the top so tongues stack rather than spread.
    const anchorAngle =
      dir === 'up'
        ? -Math.PI / 2 + (i - count / 2) * 0.06 // slight horizontal spread
        : baseAngle

    const binIdx = (i * binStep) % totalBins
    const bandEnergy = (raw[binIdx] ?? 0) / 255
    const flicker = 0.85 + 0.15 * Math.sin(tSec * seeds.freqs[i] * Math.PI + seeds.phases[i])
    const length =
      baseLength * (0.7 + bandEnergy * 1.5 + bassEnergy + beat * 0.4) * flicker

    // Anchor point on the base ring.
    const ax = Math.cos(anchorAngle) * baseR
    const ay = Math.sin(anchorAngle) * baseR
    // Tip: 'all' points outward radially; 'up' points up regardless
    // of the tongue's horizontal position (gives the rising-flame
    // look).
    const tipDir =
      dir === 'up' ? -Math.PI / 2 : anchorAngle
    const tx = ax + Math.cos(tipDir) * length
    const ty = ay + Math.sin(tipDir) * length

    // Side base points — perpendicular to tip direction, narrower
    // than the tongue length so the triangle reads as elongated.
    const perpDir = tipDir + Math.PI / 2
    const sideWidth = (baseR * 0.4) * (0.6 + flicker * 0.4) * (1 + beat * 0.3)
    const lx = ax + Math.cos(perpDir) * sideWidth * 0.5
    const ly = ay + Math.sin(perpDir) * sideWidth * 0.5
    const rx = ax - Math.cos(perpDir) * sideWidth * 0.5
    const ry = ay - Math.sin(perpDir) * sideWidth * 0.5

    // Linear gradient from anchor centre to tip — hot at base,
    // transparent at the tip so adjacent tongues blend.
    const grad = ctx.createLinearGradient(ax, ay, tx, ty)
    grad.addColorStop(0, hotColor)
    grad.addColorStop(0.6, tipColor)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad

    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = hotColor
      ctx.shadowBlur = config.glowIntensity * (0.4 + bandEnergy * 0.6)
    }

    // Closed quadratic-bezier triangle: side base → curve to tip →
    // curve back to other side base. Curves convex out from the
    // tongue's axis so the silhouette reads as a teardrop rather
    // than a sharp wedge.
    ctx.beginPath()
    ctx.moveTo(lx, ly)
    const ctrl1x = ax + Math.cos(tipDir) * length * 0.5 + Math.cos(perpDir) * sideWidth * 0.7
    const ctrl1y = ay + Math.sin(tipDir) * length * 0.5 + Math.sin(perpDir) * sideWidth * 0.7
    ctx.quadraticCurveTo(ctrl1x, ctrl1y, tx, ty)
    const ctrl2x = ax + Math.cos(tipDir) * length * 0.5 - Math.cos(perpDir) * sideWidth * 0.7
    const ctrl2y = ay + Math.sin(tipDir) * length * 0.5 - Math.sin(perpDir) * sideWidth * 0.7
    ctx.quadraticCurveTo(ctrl2x, ctrl2y, rx, ry)
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}
