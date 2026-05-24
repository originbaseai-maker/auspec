import type { FrameConfig } from '@/store/useFrameStore'

function alphaHex(intensity: number): string {
  // Map 0–100 intensity to a two-char hex alpha (00–FF).
  const a = Math.max(0, Math.min(255, Math.round(intensity * 2.55)))
  return a.toString(16).padStart(2, '0')
}

/**
 * Draws the configured frame (border + shadow + halo + reflection)
 * onto the visualizer canvas. Called every frame from VisualizerCanvas so
 * the frame is part of canvas.captureStream() output — making it visible
 * in exported video. The CSS FrameWrapper is a passthrough when enabled.
 *
 * Multiple shadow effects (drop shadow + halo) can't share a single
 * stroke because Canvas2D only supports one shadow per draw. We pass the
 * border path 2× (one stroke per shadow color) and finish with a clean
 * border stroke on top.
 */
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
    haloEnabled,
    haloIntensity,
    shadowEnabled,
    shadowIntensity,
    shadowColor,
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
  const buildPath = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath()
    if (r > 0 && supportsRoundRect) {
      ctx.roundRect(x, y, w, h, r)
    } else {
      ctx.rect(x, y, w, h)
    }
  }

  if (finalThickness > 0) {
    const inset = finalThickness / 2
    const w = width - finalThickness
    const h = height - finalThickness

    // Pass 1: drop shadow
    if (shadowEnabled && shadowIntensity > 0) {
      ctx.save()
      ctx.shadowColor = shadowColor + alphaHex(shadowIntensity)
      ctx.shadowBlur = shadowIntensity * 0.6
      ctx.shadowOffsetY = shadowIntensity * 0.1
      ctx.strokeStyle = color
      ctx.lineWidth = finalThickness
      buildPath(inset, inset, w, h)
      ctx.stroke()
      ctx.restore()
    }

    // Pass 2: halo (color glow, bass-boosted)
    if (haloEnabled && haloIntensity > 0) {
      ctx.save()
      ctx.shadowColor = color
      ctx.shadowBlur = haloIntensity * 0.8 * (1 + bassEnergy * 0.3)
      ctx.strokeStyle = color
      ctx.lineWidth = finalThickness
      buildPath(inset, inset, w, h)
      ctx.stroke()
      ctx.restore()
    }

    // Pass 3: clean border stroke on top
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = finalThickness
    buildPath(inset, inset, w, h)
    ctx.stroke()
    ctx.restore()
  }

  // Reflection — glossy gradient overlay, clipped to the frame's rounded rect
  if (reflectionEnabled && reflectionIntensity > 0) {
    ctx.save()
    if (r > 0 && supportsRoundRect) {
      buildPath(0, 0, width, height)
      ctx.clip()
    }
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    const top = (reflectionIntensity / 100) * 0.25
    const bottom = (reflectionIntensity / 100) * 0.08
    grad.addColorStop(0, `rgba(255,255,255,${top})`)
    grad.addColorStop(0.4, 'rgba(255,255,255,0)')
    grad.addColorStop(0.6, 'rgba(255,255,255,0)')
    grad.addColorStop(1, `rgba(255,255,255,${bottom})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }
}
