import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import {
  colorFromPalette,
  firstColor,
  resolvePalette,
} from '@/lib/colorPalette'
import { applyBandSensitivity } from '@/lib/frequencyUtils'

/**
 * Per-config rotation accumulator. Keyed by the live config object via
 * WeakMap so when a layer is deleted (its config released) the entry is
 * garbage-collected automatically — no manual cleanup hook needed.
 */
const rotationByConfig = new WeakMap<
  BloomConfig,
  { rotation: number; lastTime: number }
>()

/**
 * Pre-allocated sample buffer reused across calls. Single global buffer
 * is safe — bloom renders are synchronous within a single rAF tick.
 * Resized lazily when pointCount changes.
 */
let sampleBuf = new Float32Array(256)

function ensureSampleBuf(n: number): Float32Array {
  if (sampleBuf.length < n) sampleBuf = new Float32Array(n)
  return sampleBuf
}

export function drawBloom(
  ctx: CanvasRenderingContext2D,
  config: BloomConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const cx = width * (config.offsetX ?? 0.5)
  const cy = height * (config.offsetY ?? 0.5)

  const raw = data.raw
  const startBin = Math.max(
    0,
    Math.floor((config.startFrequency / 100) * raw.length),
  )
  const endBin = Math.min(
    raw.length,
    Math.floor((config.endFrequency / 100) * raw.length),
  )
  const usableBins = Math.max(1, endBin - startBin)

  const pointCount = Math.max(8, Math.min(256, Math.floor(config.pointCount)))
  const samples = ensureSampleBuf(pointCount)

  // Sample N points across the chosen frequency window, applying per-band
  // sensitivity. Each sample is normalized to 0..1.
  for (let i = 0; i < pointCount; i++) {
    const t = i / pointCount
    const binIdx = startBin + Math.floor(t * usableBins)
    const rawValue = raw[binIdx] ?? 0
    const adjusted = applyBandSensitivity(
      rawValue,
      binIdx,
      raw.length,
      config.bassSensitivity ?? 1,
      config.midSensitivity ?? 1,
      config.trebleSensitivity ?? 1,
    )
    samples[i] = adjusted / 255
  }

  // Bass pulse — entire shape scales with bass energy.
  const bassEnergy = data.bass / 255
  const pulseScale = 1 + bassEnergy * config.bassPulse

  // Rotation: static offset + time-accumulated animation.
  const now = performance.now()
  let rotState = rotationByConfig.get(config)
  if (!rotState) {
    rotState = { rotation: 0, lastTime: now }
    rotationByConfig.set(config, rotState)
  }
  // Clamp dt so a tab-switch hiccup doesn't spin the shape wildly.
  const dtSec = Math.min(0.1, (now - rotState.lastTime) / 1000)
  rotState.rotation += config.rotationSpeed * dtSec
  rotState.lastTime = now
  const totalRotationRad =
    ((config.rotation + rotState.rotation) * Math.PI) / 180

  const palette = resolvePalette(
    config.palette,
    config.colorStart,
    config.colorEnd,
  )

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(totalRotationRad)
  ctx.lineWidth = config.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Pre-allocate point arrays — reused per echo since each echo just
  // shifts the radius offset.
  const xs = new Float32Array(pointCount)
  const ys = new Float32Array(pointCount)

  const echoCount = Math.max(1, Math.floor(config.echoCount))
  const smoothness = Math.max(0, Math.min(1, config.smoothness))

  // Draw rings back-to-front (outer-most first) so the brightest echo
  // (e=0) ends up visually on top.
  for (let e = echoCount - 1; e >= 0; e--) {
    const echoProgress = echoCount > 1 ? e / (echoCount - 1) : 0
    const radiusOffset =
      config.echoMode === 'outward'
        ? e * config.echoSpacing
        : -e * config.echoSpacing
    const alpha = Math.pow(config.echoFalloff, e)

    const color =
      palette.length >= 2
        ? colorFromPalette(
            config.palette,
            config.colorStart,
            config.colorEnd,
            echoProgress,
          )
        : firstColor(config.palette, config.colorStart)

    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = color
      ctx.shadowBlur = config.glowIntensity
    } else {
      ctx.shadowBlur = 0
    }

    // Build the point cloud for this echo ring.
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2
      const amp = samples[i]
      const r =
        (config.baseRadius + amp * config.amplitudeScale * 100 + radiusOffset) *
        pulseScale
      xs[i] = Math.cos(angle) * r
      ys[i] = Math.sin(angle) * r
    }

    // Single curve algorithm controlled by smoothness:
    //   - smoothness === 0  → straight polygon edges through each point
    //   - smoothness === 1  → quadratic Bezier through midpoints (most
    //                         organic shape)
    //   - intermediate      → control point lerped between the raw vertex
    //                         and the midpoint, giving a gradual rounding
    ctx.beginPath()
    if (smoothness <= 0.001) {
      ctx.moveTo(xs[0], ys[0])
      for (let i = 1; i < pointCount; i++) {
        ctx.lineTo(xs[i], ys[i])
      }
    } else {
      // Start at the midpoint between last and first vertex so the curve
      // wraps seamlessly when closed.
      ctx.moveTo(
        (xs[0] + xs[pointCount - 1]) / 2,
        (ys[0] + ys[pointCount - 1]) / 2,
      )
      for (let i = 0; i < pointCount; i++) {
        const next = (i + 1) % pointCount
        const midX = (xs[i] + xs[next]) / 2
        const midY = (ys[i] + ys[next]) / 2
        // Control point: blend midpoint (smoothness=0 limit) ↔ vertex
        // (smoothness=1 limit). When smoothness is high, the curve
        // bulges through the vertex; when low, it cuts closer to the
        // midpoint — producing rounder corners.
        const ctrlX = midX + (xs[i] - midX) * smoothness
        const ctrlY = midY + (ys[i] - midY) * smoothness
        ctx.quadraticCurveTo(ctrlX, ctrlY, midX, midY)
      }
    }

    if (config.closedShape) ctx.closePath()
    ctx.stroke()
  }

  ctx.restore()
}
