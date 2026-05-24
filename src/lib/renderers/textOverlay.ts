import type { TextLayer, TextPosition } from '@/store/useTextStore'

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
 * Draw order: artist first, then title, then custom — so title dominates
 * if the two music-metadata layers overlap.
 */
export function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: TextOverlayConfig,
): void {
  const layers = [config.artist, config.title, config.custom]
  for (const layer of layers) {
    if (!layer.enabled || !layer.text.trim()) continue
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

  const padding = Math.max(16, layer.fontSize * 0.6)
  const { x, y, align, baseline } = positionToCoords(
    layer.position,
    width,
    height,
    padding,
  )

  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillText(layer.text, x, y)

  ctx.restore()
}

interface PositionResult {
  x: number
  y: number
  align: CanvasTextAlign
  baseline: CanvasTextBaseline
}

function positionToCoords(
  pos: TextPosition,
  width: number,
  height: number,
  padding: number,
): PositionResult {
  const [vert, horiz] = pos.split('-') as [string, string]

  let x: number
  let align: CanvasTextAlign
  if (horiz === 'left') {
    x = padding
    align = 'left'
  } else if (horiz === 'right') {
    x = width - padding
    align = 'right'
  } else {
    x = width / 2
    align = 'center'
  }

  let y: number
  let baseline: CanvasTextBaseline
  if (vert === 'top') {
    y = padding
    baseline = 'top'
  } else if (vert === 'bottom') {
    y = height - padding
    baseline = 'bottom'
  } else {
    y = height / 2
    baseline = 'middle'
  }

  return { x, y, align, baseline }
}
