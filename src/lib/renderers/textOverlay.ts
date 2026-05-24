import type { TextLayer, TextLayerId } from '@/store/useTextStore'

interface TextOverlayConfig {
  title: TextLayer
  artist: TextLayer
  custom: TextLayer
}

/**
 * Painted on the canvas after the visualizer and frame, so the text:
 *   1. Sits on top of everything else.
 *   2. Is captured by canvas.captureStream() for video export.
 *
 * `editingLayerId` lets us skip painting a layer while the user is
 * inline-editing its HTML overlay — otherwise the canvas text would
 * show through behind the input field.
 *
 * Draw order: artist first, then title, then custom — so title dominates
 * if the two music-metadata layers overlap.
 */
export function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: TextOverlayConfig,
  editingLayerId: TextLayerId | null,
): void {
  const layers = [config.artist, config.title, config.custom]
  for (const layer of layers) {
    if (!layer.enabled || !layer.text.trim()) continue
    if (editingLayerId === layer.id) continue
    drawSingleText(ctx, width, height, layer)
  }
}

function drawSingleText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layer: TextLayer,
): void {
  ctx.save()

  ctx.font = `${layer.fontWeight} ${layer.fontSize}px "${layer.font}", sans-serif`
  ctx.fillStyle = layer.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if ('letterSpacing' in ctx) {
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${layer.letterSpacing}px`
  }

  if (layer.shadowEnabled && layer.shadowIntensity > 0) {
    ctx.shadowColor = layer.shadowColor
    ctx.shadowBlur = layer.shadowIntensity * 0.3
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = layer.shadowIntensity * 0.04
  }

  ctx.fillText(layer.text, layer.x * width, layer.y * height)

  ctx.restore()
}
