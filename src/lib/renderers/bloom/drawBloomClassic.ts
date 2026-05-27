import type { BloomConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { firstColor } from '@/lib/colorPalette'
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

export function drawBloomClassic(
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

  const bassEnergy = data.bass / 255
  const pulseScale = 1 + bassEnergy * config.bassPulse

  const now = performance.now()
  let rotState = rotationByConfig.get(config)
  if (!rotState) {
    rotState = { rotation: 0, lastTime: now }
    rotationByConfig.set(config, rotState)
  }
  const dtSec = Math.min(0.1, (now - rotState.lastTime) / 1000)
  rotState.rotation += config.rotationSpeed * dtSec
  rotState.lastTime = now
  const totalRotationRad =
    ((config.rotation + rotState.rotation) * Math.PI) / 180

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(totalRotationRad)
  ctx.lineWidth = config.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const xs = new Float32Array(pointCount)
  const ys = new Float32Array(pointCount)
  const smoothness = Math.max(0, Math.min(1, config.smoothness))

  // Single-ring render. The withEcho wrapper in index.ts multiplies
  // this into N concentric echoes when echoCount > 1; here we draw
  // exactly one pass at the original size. Colour pulls from the
  // first palette stop so wrapper-scaled echoes stay coherent.
  const color = firstColor(config.palette, config.colorStart)
  ctx.strokeStyle = color
  if (config.glowEnabled && config.glowIntensity > 0) {
    ctx.shadowColor = color
    ctx.shadowBlur = config.glowIntensity
  }

  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2
    const amp = samples[i]
    const r =
      (config.baseRadius + amp * config.amplitudeScale * 100) * pulseScale
    xs[i] = Math.cos(angle) * r
    ys[i] = Math.sin(angle) * r
  }

  ctx.beginPath()
  if (smoothness <= 0.001) {
    ctx.moveTo(xs[0], ys[0])
    for (let i = 1; i < pointCount; i++) {
      ctx.lineTo(xs[i], ys[i])
    }
  } else {
    ctx.moveTo(
      (xs[0] + xs[pointCount - 1]) / 2,
      (ys[0] + ys[pointCount - 1]) / 2,
    )
    for (let i = 0; i < pointCount; i++) {
      const next = (i + 1) % pointCount
      const midX = (xs[i] + xs[next]) / 2
      const midY = (ys[i] + ys[next]) / 2
      const ctrlX = midX + (xs[i] - midX) * smoothness
      const ctrlY = midY + (ys[i] - midY) * smoothness
      ctx.quadraticCurveTo(ctrlX, ctrlY, midX, midY)
    }
  }

  if (config.closedShape) ctx.closePath()
  ctx.stroke()

  ctx.restore()
}
