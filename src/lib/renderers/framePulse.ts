import type { FrequencyData } from '@/types/analyzer'

export interface FramePulseConfig {
  enabled: boolean
  baseColor: string
  beatColor: string
  intensity: number
  thickness: number
  beatThreshold: number
}

export const DEFAULT_FRAME_PULSE_CONFIG: FramePulseConfig = {
  enabled: true,
  baseColor: '#3b82f6',
  beatColor: '#8b5cf6',
  intensity: 1,
  thickness: 4,
  beatThreshold: 0.6,
}

interface Rgb {
  r: number
  g: number
  b: number
}

function hexToRgb(hex: string): Rgb {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 59, g: 130, b: 246 }
}

function lerpColor(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  }
}

export function renderFramePulse(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: FramePulseConfig,
  width: number,
  height: number,
): void {
  if (!config.enabled) return

  const { bass, beatEnergy } = frequencyData
  const { baseColor, beatColor, intensity, thickness, beatThreshold } = config

  const baseRgb = hexToRgb(baseColor)
  const beatRgb = hexToRgb(beatColor)

  const t = Math.min(1, beatEnergy)
  const color = lerpColor(baseRgb, beatRgb, t)

  const bassNorm = bass / 255
  const glowBlur = 8 + bassNorm * 32

  const isBeat = beatEnergy > beatThreshold
  const alpha = intensity * (isBeat ? 1.0 : 0.4 + bassNorm * 0.6)
  const extraBlur = isBeat ? 20 : 0

  const colorStr = `rgba(${color.r},${color.g},${color.b},${alpha})`
  const shadowColorStr = `rgb(${color.r},${color.g},${color.b})`

  const inset = thickness / 2
  const rectW = width - thickness
  const rectH = height - thickness

  ctx.save()
  ctx.strokeStyle = colorStr
  ctx.lineWidth = thickness + 4
  ctx.shadowBlur = glowBlur + extraBlur
  ctx.shadowColor = shadowColorStr
  ctx.strokeRect(inset, inset, rectW, rectH)

  ctx.shadowBlur = glowBlur * 0.5
  ctx.lineWidth = thickness
  ctx.strokeRect(inset, inset, rectW, rectH)
  ctx.restore()
}
