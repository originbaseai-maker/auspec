import type { FrameConfig } from '@/store/useFrameStore'

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
): void {
  drawFrame(ctx, width, height, config, bassEnergy)
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: FrameConfig,
  bassEnergy: number, // 0–1
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
  } = config

  const pulseScale = pulseEnabled
    ? 1 + bassEnergy * (pulseIntensity / 100)
    : 1
  const finalThickness = thickness * pulseScale
  const r = smoothness
  const supportsRoundRect = typeof ctx.roundRect === 'function'

  if (finalThickness > 0) {
    const inset = finalThickness / 2
    const w = width - finalThickness
    const h = height - finalThickness

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = finalThickness
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
