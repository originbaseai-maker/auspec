import type { FrequencyData } from '@/types/analyzer'
import type { VideoSyncMode } from '@/types/video'
import type { VideoFit } from '@/types/layer'
import {
  applyBandSensitivityByFreq,
  freqToSpectrumIdx,
  spectrumIdxToFreq,
} from '@/lib/audio/logScaleBins'
import {
  addPaletteStops,
  firstColor,
  lastColor,
  resolveBarColor,
} from '@/lib/colorPalette'
import { getVideoElement } from '@/lib/videoPool'

export type CircularSideMode = 'both' | 'side_a' | 'side_b'

export interface CircularSpectrumConfig {
  radius: number
  innerRadius: number
  barCount: number
  colorStart: string
  colorEnd: string
  /** Optional multi-color palette (3-7). When set, overrides colorStart/colorEnd. */
  palette?: string[]
  glowEnabled: boolean
  glowIntensity: number
  rotation: number
  smoothing: number
  bassPulse: boolean
  hueInterpolation: number
  startFrequency: number
  endFrequency: number
  sideMode: CircularSideMode
  /** Per-band gain multipliers (0–2, default 1). Bass = 0–15% of bins, Mid = 15–50%, Treble = 50–100%. */
  bassSensitivity?: number
  midSensitivity?: number
  trebleSensitivity?: number
  /** Center position as fraction of canvas (0–1). Default 0.5 = center. */
  offsetX?: number
  offsetY?: number
  /** When true, clip a video into the outer ring annulus. */
  videoFillEnabled?: boolean
  videoFillAssetId?: string | null
  videoFillSyncMode?: VideoSyncMode
  videoFillFit?: VideoFit
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
    palette,
    glowEnabled,
    glowIntensity,
    rotation,
    smoothing,
    bassPulse,
    hueInterpolation,
    startFrequency,
    endFrequency,
    sideMode,
    bassSensitivity = 1,
    midSensitivity = 1,
    trebleSensitivity = 1,
  } = config
  const { spectrum, spectrumBins, bass } = frequencyData

  if (!spectrum || spectrumBins === 0) return

  const sStart = freqToSpectrumIdx(startFrequency, spectrumBins)
  const sEnd = freqToSpectrumIdx(endFrequency, spectrumBins)
  const sRange = Math.max(1, sEnd - sStart)

  const drawOutward = sideMode !== 'side_b'
  const drawInward = sideMode !== 'side_a'

  // Position fraction (0–1); defaults to 0.5 = canvas center.
  const cx = width * (config.offsetX ?? 0.5)
  const cy = height * (config.offsetY ?? 0.5)
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
  // Inward bars can extend at most to the center; cap so they don't cross it.
  const inwardMaxLength = Math.max(0, pulseAmount - 4)

  const rotationRad = (rotation * Math.PI) / 180
  const angleStep = (Math.PI * 2) / barCount

  const gradient = ctx.createRadialGradient(
    cx,
    cy,
    effectiveInnerRadius,
    cx,
    cy,
    effectiveOuterRadius,
  )
  addPaletteStops(gradient, palette, colorStart, colorEnd)

  ctx.save()

  // Optional video fill — clipped to the outer circular boundary
  // (annulus = full outer disc; bars overdraw and frame the video).
  if (config.videoFillEnabled && config.videoFillAssetId) {
    const video = getVideoElement(config.videoFillAssetId)
    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, effectiveOuterRadius, 0, Math.PI * 2)
      ctx.clip()
      const bw = effectiveOuterRadius * 2
      const bh = effectiveOuterRadius * 2
      const lx = cx - effectiveOuterRadius
      const ly = cy - effectiveOuterRadius
      const vw = video.videoWidth
      const vh = video.videoHeight
      const vAR = vw / vh
      const boxAR = bw / Math.max(bh, 1)
      const fit = config.videoFillFit ?? 'cover'
      let dx = lx
      let dy = ly
      let dw = bw
      let dh = bh
      if (fit === 'cover') {
        if (vAR > boxAR) {
          dw = bh * vAR
          dx = lx + (bw - dw) / 2
        } else {
          dh = bw / vAR
          dy = ly + (bh - dh) / 2
        }
      } else if (fit === 'contain') {
        if (vAR > boxAR) {
          dh = bw / vAR
          dy = ly + (bh - dh) / 2
        } else {
          dw = bh * vAR
          dx = lx + (bw - dw) / 2
        }
      }
      ctx.drawImage(video, dx, dy, dw, dh)
      ctx.restore()
    }
  }

  if (glowEnabled) {
    ctx.shadowBlur = glowIntensity
    ctx.shadowColor = lastColor(palette, colorEnd)
  } else {
    ctx.shadowBlur = 0
  }

  // Palette OR hue rainbow force per-bar coloring; radial gradient only works
  // for the legacy 2-color case where every bar's color comes from its radial
  // position (which they all share, since bars run radially).
  const usePerBar = hueInterpolation > 0 || (palette && palette.length >= 2)
  if (!usePerBar) {
    ctx.strokeStyle = gradient
    ctx.fillStyle = gradient
  }
  ctx.lineCap = 'round'

  // bar thickness as arc-chord length
  const barThickness = Math.max(1, (Math.PI * 2 * effectiveInnerRadius) / barCount - 1)
  ctx.lineWidth = barThickness

  for (let i = 0; i < barCount; i++) {
    const sIdxF = sStart + (i / barCount) * sRange
    const sIdx = Math.min(spectrumBins - 1, Math.max(0, Math.floor(sIdxF)))
    const freq = spectrumIdxToFreq(sIdx, spectrumBins)
    const value = applyBandSensitivityByFreq(
      spectrum[sIdx] ?? 0,
      freq,
      bassSensitivity,
      midSensitivity,
      trebleSensitivity,
    )
    const targetLength = value * barMaxLength

    previousHeights[i] =
      previousHeights[i] + (targetLength - previousHeights[i]) * smoothing

    const barLength = previousHeights[i]
    const angle = i * angleStep + rotationRad
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    const x1 = cx + cosA * pulseAmount
    const y1 = cy + sinA * pulseAmount

    if (usePerBar) {
      ctx.strokeStyle = resolveBarColor(
        i / barCount,
        palette,
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
    const outlineColor = firstColor(palette, colorStart)
    ctx.beginPath()
    ctx.lineWidth = 2
    ctx.strokeStyle = outlineColor
    ctx.shadowBlur = glowEnabled ? glowIntensity * 1.5 : 0
    ctx.shadowColor = outlineColor
    ctx.arc(cx, cy, pulseAmount, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}
