import type { FrameConfig } from '@/store/useFrameStore'

interface Rgb {
  r: number
  g: number
  b: number
}

function hexToRgb(hex: string): Rgb {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m
    ? {
        r: parseInt(m[1], 16),
        g: parseInt(m[2], 16),
        b: parseInt(m[3], 16),
      }
    : { r: 59, g: 130, b: 246 }
}

function lerpColor(a: Rgb, b: Rgb, t: number): string {
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r},${g},${bl})`
}

/**
 * Draws the border + reflection onto the visualizer canvas, so those
 * effects are part of `canvas.captureStream()` output and show up in
 * exported video.
 *
 * Halo and drop shadow are intentionally NOT painted here — they are
 * applied as CSS `box-shadow` on FrameWrapper instead, because shadows
 * painted on the canvas are clipped by the canvas bounds and end up
 * looking like a second nested frame. The CSS approach lets them bleed
 * outside the canvas like real shadows. The cost: they're absent from
 * exported video.
 *
 * The border stroke is centered on the canvas edge (inset = thickness/2),
 * and the reflection is inset by the FULL thickness so the gradient
 * sheen stays inside the border rather than overlapping it.
 */
/**
 * Per-layer drawing entry point used by the canvas layer loop. Signature
 * mirrors the other layer renderers (ctx, config, width, height, data).
 * Computes its own bassEnergy from frequencyData when present.
 */
export function drawFrameLayer(
  ctx: CanvasRenderingContext2D,
  config: FrameConfig,
  width: number,
  height: number,
  bassEnergy: number,
  beatEnergy = 0,
): void {
  drawFrame(ctx, width, height, config, bassEnergy, beatEnergy)
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: FrameConfig,
  bassEnergy: number, // 0–1
  beatEnergy = 0, // raw, typically 0–1
): void {
  if (!config.enabled) return

  const {
    color,
    thickness,
    smoothness,
    reflectionEnabled,
    reflectionIntensity,
    pulseEnabled,
    pulseIntensity,
    beatColor,
    beatThreshold = 0.6,
    beatBlur = 0,
  } = config

  const pulseScale = pulseEnabled
    ? 1 + bassEnergy * (pulseIntensity / 100)
    : 1
  const finalThickness = thickness * pulseScale
  const r = smoothness
  const supportsRoundRect = typeof ctx.roundRect === 'function'

  // Lerp the stroke colour and shadow blur from `color` → `beatColor`
  // as beatEnergy crosses beatThreshold. lerpAmount is 0 below the
  // threshold and ramps to 1 at peak — preserves a calm rest state
  // and a punchy on-beat hit. Both beatColor and beatBlur are
  // optional; if neither is set, this whole block is a no-op.
  const lerpAmount = beatColor
    ? Math.max(
        0,
        Math.min(1, (beatEnergy - beatThreshold) / Math.max(0.0001, 1 - beatThreshold)),
      )
    : 0
  const renderColor = beatColor
    ? lerpColor(hexToRgb(color), hexToRgb(beatColor), lerpAmount)
    : color
  const renderBlur = beatBlur > 0 ? beatBlur * lerpAmount : 0

  if (finalThickness > 0) {
    const inset = finalThickness / 2
    const w = width - finalThickness
    const h = height - finalThickness

    ctx.save()
    ctx.strokeStyle = renderColor
    ctx.lineWidth = finalThickness
    if (renderBlur > 0) {
      ctx.shadowColor = renderColor
      ctx.shadowBlur = renderBlur
    }
    ctx.beginPath()
    if (r > 0 && supportsRoundRect) {
      ctx.roundRect(inset, inset, w, h, r)
    } else {
      ctx.rect(inset, inset, w, h)
    }
    ctx.stroke()
    ctx.restore()
  }

  if (reflectionEnabled && reflectionIntensity > 0) {
    const inset = Math.max(0, finalThickness)
    const reflW = width - inset * 2
    const reflH = height - inset * 2
    if (reflW <= 0 || reflH <= 0) return

    ctx.save()
    if (r > 0 && supportsRoundRect) {
      const innerR = Math.max(0, r - finalThickness / 2)
      ctx.beginPath()
      ctx.roundRect(inset, inset, reflW, reflH, innerR)
      ctx.clip()
    }
    const grad = ctx.createLinearGradient(0, inset, 0, inset + reflH)
    const top = (reflectionIntensity / 100) * 0.15
    const bottom = (reflectionIntensity / 100) * 0.05
    grad.addColorStop(0, `rgba(255,255,255,${top})`)
    grad.addColorStop(0.3, 'rgba(255,255,255,0)')
    grad.addColorStop(0.7, 'rgba(255,255,255,0)')
    grad.addColorStop(1, `rgba(255,255,255,${bottom})`)
    ctx.fillStyle = grad
    ctx.fillRect(inset, inset, reflW, reflH)
    ctx.restore()
  }
}
