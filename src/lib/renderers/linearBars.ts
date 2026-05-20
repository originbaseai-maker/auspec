import type { FrequencyData } from '@/types/analyzer'

export interface LinearBarsConfig {
  barCount: number
  barGap: number
  minBarHeight: number
  colorStart: string
  colorEnd: string
  glowEnabled: boolean
  glowIntensity: number
  mirrorMode: boolean
  smoothing: number
}

export function renderLinearBars(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: LinearBarsConfig,
  width: number,
  height: number,
  previousHeights: Float32Array,
): void {
  const {
    barCount,
    barGap,
    minBarHeight,
    colorStart,
    colorEnd,
    glowEnabled,
    glowIntensity,
    mirrorMode,
    smoothing,
  } = config
  const { raw } = frequencyData

  const totalGap = barGap * (barCount - 1)
  const barWidth = Math.max(1, (width - totalGap) / barCount)
  const step = Math.floor(raw.length / barCount)

  const gradient = ctx.createLinearGradient(0, height, 0, 0)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)

  if (glowEnabled) {
    ctx.shadowBlur = glowIntensity
    ctx.shadowColor = colorEnd
  } else {
    ctx.shadowBlur = 0
  }

  ctx.fillStyle = gradient

  for (let i = 0; i < barCount; i++) {
    const rawValue = raw[i * step] ?? 0
    const targetHeight = Math.max(
      minBarHeight,
      (rawValue / 255) * height * (mirrorMode ? 0.5 : 1),
    )

    previousHeights[i] =
      previousHeights[i] + (targetHeight - previousHeights[i]) * smoothing

    const barHeight = previousHeights[i]
    const x = i * (barWidth + barGap)

    if (mirrorMode) {
      const centerY = height / 2
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2)
    } else {
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)
    }
  }

  ctx.shadowBlur = 0
}
