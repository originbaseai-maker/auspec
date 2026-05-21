import type { FrequencyData } from '@/types/analyzer'
import { getBarColor, getFrequencyBinRange } from '@/lib/frequencyUtils'

export type CircularSideMode = 'both' | 'side_a' | 'side_b'

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
  hueInterpolation: number
  startFrequency: number
  endFrequency: number
  sideMode: CircularSideMode
}

const FALLBACK_SAMPLE_RATE = 44100

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
  hueInterpolation: 0,
  startFrequency: 20,
  endFrequency: 20000,
  sideMode: 'both',
}

export function renderCircularSpectrum(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: CircularSpectrumConfig,
  width: number,
  height: number,
  previousHeights: Float32Array,
  logoSizeRatio?: number,
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
    hueInterpolation,
    startFrequency,
    endFrequency,
    sideMode,
  } = config
  const { raw, bass } = frequencyData

  if (!raw || raw.length === 0) return

  const { startBin, endBin } = getFrequencyBinRange(
    raw.length * 2,
    FALLBACK_SAMPLE_RATE,
    startFrequency,
    endFrequency,
  )
  const slicedRaw = raw.subarray(startBin, endBin + 1)
  const sourceLen = slicedRaw.length || 1

  const drawOutward = sideMode !== 'side_b'
  const drawInward = sideMode !== 'side_a'

  const cx = width / 2
  const cy = height / 2
  const minDim = Math.min(width, height)

  // Scale base radius to fit canvas (min dimension)
  const maxRadius = minDim / 2 - 10
  const baseScale = Math.min(1, maxRadius / (radius + 100))
  const scaledRadius = radius * baseScale
  const scaledInnerRadius = innerRadius * baseScale

  // Smart Logo Mode: when a logo is wrapping the inner radius, override
  // the bar-start radius to hug the logo (+ small gap) and suppress pulse
  // and inner outline so we don't draw over the logo.
  const hasLogo = typeof logoSizeRatio === 'number' && logoSizeRatio > 0
  const logoInnerRadius = hasLogo ? (minDim * logoSizeRatio) / 2 + 8 : 0
  const effectiveInnerRadius = hasLogo ? logoInnerRadius : scaledInnerRadius
  // Ensure bars have room to grow even when the logo eats most of the canvas
  const effectiveOuterRadius = hasLogo
    ? Math.max(scaledRadius, effectiveInnerRadius + 60)
    : scaledRadius

  const bassNorm = bass / 255
  const pulseAmount =
    !hasLogo && bassPulse
      ? scaledInnerRadius * (1 + bassNorm * 0.35)
      : effectiveInnerRadius

  // Available radial space for bars
  const barMaxLength = Math.max(8, effectiveOuterRadius - effectiveInnerRadius)
  const step = Math.max(1, Math.floor(sourceLen / barCount))
  // Inward bars can extend at most to the center; cap so they don't cross it.
  const inwardMaxLength = Math.max(0, pulseAmount - 4)

  const rotationRad = (rotation * Math.PI) / 180
  const angleStep = (Math.PI * 2) / barCount

  const gradient = ctx.createRadialGradient(cx, cy, effectiveInnerRadius, cx, cy, effectiveOuterRadius)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)

  ctx.save()

  if (glowEnabled) {
    ctx.shadowBlur = glowIntensity
    ctx.shadowColor = colorEnd
  } else {
    ctx.shadowBlur = 0
  }

  if (hueInterpolation === 0) {
    ctx.strokeStyle = gradient
    ctx.fillStyle = gradient
  }
  ctx.lineCap = 'round'

  // bar thickness as arc-chord length
  const barThickness = Math.max(1, (Math.PI * 2 * effectiveInnerRadius) / barCount - 1)
  ctx.lineWidth = barThickness

  for (let i = 0; i < barCount; i++) {
    const rawValue = slicedRaw[i * step] ?? 0
    const targetLength = (rawValue / 255) * barMaxLength

    previousHeights[i] =
      previousHeights[i] + (targetLength - previousHeights[i]) * smoothing

    const barLength = previousHeights[i]
    const angle = i * angleStep + rotationRad
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    const x1 = cx + cosA * pulseAmount
    const y1 = cy + sinA * pulseAmount

    if (hueInterpolation > 0) {
      ctx.strokeStyle = getBarColor(
        i / barCount,
        colorStart,
        colorEnd,
        hueInterpolation,
      )
    }

    if (drawOutward) {
      const x2 = cx + cosA * (pulseAmount + barLength)
      const y2 = cy + sinA * (pulseAmount + barLength)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    if (drawInward && inwardMaxLength > 0) {
      const inwardLen = Math.min(barLength, inwardMaxLength)
      const x3 = cx + cosA * (pulseAmount - inwardLen)
      const y3 = cy + sinA * (pulseAmount - inwardLen)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x3, y3)
      ctx.stroke()
    }
  }

  // inner circle outline — skipped in Smart Logo Mode so we don't draw on the logo
  if (!hasLogo) {
    ctx.beginPath()
    ctx.lineWidth = 2
    ctx.strokeStyle = colorStart
    ctx.shadowBlur = glowEnabled ? glowIntensity * 1.5 : 0
    ctx.shadowColor = colorStart
    ctx.arc(cx, cy, pulseAmount, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}
