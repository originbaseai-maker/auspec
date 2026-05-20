import type { FrequencyData } from '@/types/analyzer'

export interface CircularSpectrumConfig {
  radius: number
  innerRadius: number
  barCount: number
  colorStart: string
  colorEnd: string
  glowEnabled: boolean
  glowIntensity: number
  rotation: number
  smoothing: number
  bassPulse: boolean
}

export const DEFAULT_CIRCULAR_SPECTRUM_CONFIG: CircularSpectrumConfig = {
  radius: 180,
  innerRadius: 60,
  barCount: 128,
  colorStart: '#3b82f6',
  colorEnd: '#8b5cf6',
  glowEnabled: true,
  glowIntensity: 10,
  rotation: 0,
  smoothing: 0.15,
  bassPulse: true,
}

export function renderCircularSpectrum(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: CircularSpectrumConfig,
  width: number,
  height: number,
  previousHeights: Float32Array,
): void {
  const {
    radius,
    innerRadius,
    barCount,
    colorStart,
    colorEnd,
    glowEnabled,
    glowIntensity,
    rotation,
    smoothing,
    bassPulse,
  } = config
  const { raw, bass } = frequencyData

  if (!raw || raw.length === 0) return

  const cx = width / 2
  const cy = height / 2

  // Scale base radius to fit canvas (min dimension)
  const maxRadius = Math.min(width, height) / 2 - 10
  const baseScale = Math.min(1, maxRadius / (radius + 100))
  const scaledRadius = radius * baseScale
  const scaledInnerRadius = innerRadius * baseScale

  const bassNorm = bass / 255
  const pulseAmount = bassPulse ? scaledInnerRadius * (1 + bassNorm * 0.35) : scaledInnerRadius

  // Available radial space for bars
  const barMaxLength = scaledRadius - scaledInnerRadius
  const step = Math.floor(raw.length / barCount) || 1

  const rotationRad = (rotation * Math.PI) / 180
  const angleStep = (Math.PI * 2) / barCount

  const gradient = ctx.createRadialGradient(cx, cy, scaledInnerRadius, cx, cy, scaledRadius)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)

  ctx.save()

  if (glowEnabled) {
    ctx.shadowBlur = glowIntensity
    ctx.shadowColor = colorEnd
  } else {
    ctx.shadowBlur = 0
  }

  ctx.strokeStyle = gradient
  ctx.fillStyle = gradient
  ctx.lineCap = 'round'

  // bar thickness as arc-chord length
  const barThickness = Math.max(1, (Math.PI * 2 * scaledInnerRadius) / barCount - 1)
  ctx.lineWidth = barThickness

  for (let i = 0; i < barCount; i++) {
    const rawValue = raw[i * step] ?? 0
    const targetLength = (rawValue / 255) * barMaxLength

    previousHeights[i] =
      previousHeights[i] + (targetLength - previousHeights[i]) * smoothing

    const barLength = previousHeights[i]
    const angle = i * angleStep + rotationRad

    const x1 = cx + Math.cos(angle) * pulseAmount
    const y1 = cy + Math.sin(angle) * pulseAmount
    const x2 = cx + Math.cos(angle) * (pulseAmount + barLength)
    const y2 = cy + Math.sin(angle) * (pulseAmount + barLength)

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // inner circle outline
  ctx.beginPath()
  ctx.lineWidth = 2
  ctx.strokeStyle = colorStart
  ctx.shadowBlur = glowEnabled ? glowIntensity * 1.5 : 0
  ctx.shadowColor = colorStart
  ctx.arc(cx, cy, pulseAmount, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}
