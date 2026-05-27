import type { HaloLayerConfig } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'
import { firstColor, lastColor } from '@/lib/colorPalette'

/**
 * Pulse Frame — a single closed shape framing the centre. Stroke
 * thickness and radius pulse on bass; beat hits jump the thickness
 * and momentarily flash to the palette's accent (last) colour.
 * Soft outer shadow scales with energy.
 *
 * Three geometries:
 *   - 'circle'        — perfect circle stroke
 *   - 'roundedRect'   — square with rounded corners
 *   - 'square'        — sharp-cornered square
 */
export function drawHaloPulseFrame(
  ctx: CanvasRenderingContext2D,
  config: HaloLayerConfig,
  data: FrequencyData,
  width: number,
  height: number,
): void {
  const cx = width * config.offsetX
  const cy = height * config.offsetY

  const bassEnergy = (data.bass / 255) * config.bassSensitivity
  const beat = Math.min(1, data.beatEnergy)

  const baseR = config.baseRadius + bassEnergy * 15
  const baseThickness = config.frameThickness ?? 8
  const thickness = baseThickness + bassEnergy * 8 + beat * 6

  const baseColor = firstColor(config.palette, config.colorStart)
  const accentColor = lastColor(config.palette, config.colorEnd)
  // Beat (>0.6) flashes the stroke to the accent — short colour
  // shift makes hits visible against a static loop.
  const strokeColor = beat > 0.6 ? accentColor : baseColor

  const shape = config.frameShape ?? 'circle'
  const rotRad = (config.rotation * Math.PI) / 180

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotRad)

  if (config.glowEnabled && config.glowIntensity > 0) {
    ctx.shadowColor = strokeColor
    // Glow rises sharply on beats and gently with sustained bass.
    ctx.shadowBlur =
      config.glowIntensity * (0.4 + beat * 0.6 + bassEnergy * 0.3)
  }

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = thickness
  ctx.lineJoin = shape === 'square' ? 'miter' : 'round'
  ctx.lineCap = shape === 'square' ? 'butt' : 'round'

  ctx.beginPath()
  if (shape === 'circle') {
    ctx.arc(0, 0, baseR, 0, Math.PI * 2)
  } else {
    const side = baseR * 2
    const inset = -baseR
    const corner =
      shape === 'roundedRect' ? Math.min(baseR * 0.25, 24) : 0
    if (corner > 0 && typeof ctx.roundRect === 'function') {
      ctx.roundRect(inset, inset, side, side, corner)
    } else {
      ctx.rect(inset, inset, side, side)
    }
  }
  ctx.stroke()

  ctx.restore()
}
