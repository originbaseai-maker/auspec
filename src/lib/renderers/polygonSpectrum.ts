import type { FrequencyData } from '@/types/analyzer'
import { getBarColor } from '@/lib/frequencyUtils'

export type PolygonShape =
  | 'triangle'
  | 'square'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'diamond'

export interface PolygonSpectrumConfig {
  shape: PolygonShape
  radius: number
  barCount: number
  colorStart: string
  colorEnd: string
  glowEnabled: boolean
  glowIntensity: number
  rotation: number
  smoothing: number
  fillShape: boolean
  fillOpacity: number
  barDirection: 'outward' | 'inward' | 'both'
  hueInterpolation: number
}

export const DEFAULT_POLYGON_CONFIG: PolygonSpectrumConfig = {
  shape: 'hexagon',
  radius: 160,
  barCount: 120,
  colorStart: '#3b82f6',
  colorEnd: '#8b5cf6',
  glowEnabled: true,
  glowIntensity: 10,
  rotation: 0,
  smoothing: 0.15,
  fillShape: false,
  fillOpacity: 0.1,
  barDirection: 'outward',
  hueInterpolation: 0,
}

/**
 * Draw a logo image clipped to a polygon shape, cover-fit inside the bounding box.
 * Used by Smart Logo Mode so the spectrum's polygon outline doubles as the logo mask.
 */
export function renderLogoInPolygon(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement,
  shape: PolygonShape,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
): void {
  if (radius <= 0) return
  const vertices = getPolygonVertices(shape, cx, cy, radius, rotation)

  ctx.save()
  ctx.beginPath()
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]
    if (i === 0) ctx.moveTo(v.x, v.y)
    else ctx.lineTo(v.x, v.y)
  }
  ctx.closePath()
  ctx.clip()

  const size = radius * 2
  const scale = Math.max(size / logoImg.naturalWidth, size / logoImg.naturalHeight)
  const drawW = logoImg.naturalWidth * scale
  const drawH = logoImg.naturalHeight * scale
  ctx.drawImage(logoImg, cx - drawW / 2, cy - drawH / 2, drawW, drawH)

  ctx.restore()
}

export function getPolygonVertices(
  shape: PolygonShape,
  cx: number,
  cy: number,
  radius: number,
  rotation: number,
): Array<{ x: number; y: number }> {
  const rotRad = (rotation * Math.PI) / 180

  if (shape === 'star') {
    // 6-point star: alternating outer/inner vertices, 12 total
    const points: Array<{ x: number; y: number }> = []
    const numPoints = 6
    const innerRadius = radius * 0.45
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (i * Math.PI) / numPoints + rotRad
      const r = i % 2 === 0 ? radius : innerRadius
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      })
    }
    return points
  }

  const sides =
    shape === 'triangle'
      ? 3
      : shape === 'square'
        ? 4
        : shape === 'pentagon'
          ? 5
          : shape === 'hexagon'
            ? 6
            : shape === 'diamond'
              ? 4
              : 6

  // Diamond is a square rotated 45° baseline
  const extraRot = shape === 'diamond' ? Math.PI / 4 : 0

  const verts: Array<{ x: number; y: number }> = new Array(sides)
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + rotRad + extraRot
    verts[i] = {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    }
  }
  return verts
}

interface PerimeterPoint {
  x: number
  y: number
  nx: number
  ny: number
}

function getPerimeterPoints(
  vertices: Array<{ x: number; y: number }>,
  count: number,
): PerimeterPoint[] {
  const n = vertices.length

  const segments: number[] = new Array(n)
  let totalLength = 0
  for (let i = 0; i < n; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % n]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    segments[i] = len
    totalLength += len
  }

  // Centroid (computed once for normal-direction check)
  let centroidX = 0
  let centroidY = 0
  for (let i = 0; i < n; i++) {
    centroidX += vertices[i].x
    centroidY += vertices[i].y
  }
  centroidX /= n
  centroidY /= n

  const points: PerimeterPoint[] = new Array(count)
  const spacing = totalLength / count

  for (let i = 0; i < count; i++) {
    const target = i * spacing

    let accumulated = 0
    let si = 0
    while (si < n && accumulated + segments[si] < target) {
      accumulated += segments[si]
      si++
    }
    if (si >= n) si = n - 1

    const a = vertices[si]
    const b = vertices[(si + 1) % n]
    const t = segments[si] > 0 ? (target - accumulated) / segments[si] : 0

    const px = a.x + (b.x - a.x) * t
    const py = a.y + (b.y - a.y) * t

    // Outward normal: perpendicular to edge, flipped if it points inward.
    const edgeX = b.x - a.x
    const edgeY = b.y - a.y
    const edgeLen = segments[si] || 1
    let nx = -edgeY / edgeLen
    let ny = edgeX / edgeLen
    if (nx * (px - centroidX) + ny * (py - centroidY) < 0) {
      nx = -nx
      ny = -ny
    }

    points[i] = { x: px, y: py, nx, ny }
  }

  return points
}

export function renderPolygonSpectrum(
  ctx: CanvasRenderingContext2D,
  frequencyData: FrequencyData,
  config: PolygonSpectrumConfig,
  width: number,
  height: number,
  previousHeights: Float32Array,
): void {
  const {
    shape,
    radius,
    barCount,
    colorStart,
    colorEnd,
    glowEnabled,
    glowIntensity,
    rotation,
    smoothing,
    fillShape,
    fillOpacity,
    barDirection,
    hueInterpolation,
  } = config
  const { raw } = frequencyData

  if (!raw || raw.length === 0) return

  const cx = width / 2
  const cy = height / 2

  // Fit radius inside canvas with a small margin.
  const maxR = Math.min(width, height) / 2 - 20
  const scaledRadius = Math.min(radius, Math.max(0, maxR))
  if (scaledRadius <= 0) return
  const maxBarHeight = scaledRadius * 0.4

  const vertices = getPolygonVertices(shape, cx, cy, scaledRadius, rotation)
  const perimeterPts = getPerimeterPoints(vertices, barCount)

  // Parse colorStart hex once for the polygon fill / outline.
  // Per-bar color is delegated to getBarColor() so hue interpolation works.
  const r1 = parseInt(colorStart.slice(1, 3), 16)
  const g1 = parseInt(colorStart.slice(3, 5), 16)
  const b1 = parseInt(colorStart.slice(5, 7), 16)

  const step = Math.max(1, Math.floor(raw.length / barCount))

  ctx.save()

  // 1. Filled polygon (drawn before bars, per contract)
  if (fillShape) {
    ctx.beginPath()
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i]
      if (i === 0) ctx.moveTo(v.x, v.y)
      else ctx.lineTo(v.x, v.y)
    }
    ctx.closePath()
    ctx.fillStyle = `rgba(${r1},${g1},${b1},${fillOpacity})`
    ctx.fill()
  }

  // 2. Polygon outline (subtle, behind the spectrum bars)
  ctx.beginPath()
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]
    if (i === 0) ctx.moveTo(v.x, v.y)
    else ctx.lineTo(v.x, v.y)
  }
  ctx.closePath()
  ctx.strokeStyle = `rgba(${r1},${g1},${b1},0.4)`
  ctx.lineWidth = 1.5
  ctx.shadowBlur = glowEnabled ? glowIntensity * 0.5 : 0
  ctx.shadowColor = colorStart
  ctx.stroke()

  // 3. Spectrum bars along perimeter
  if (glowEnabled) {
    ctx.shadowBlur = glowIntensity
    ctx.shadowColor = colorEnd
  } else {
    ctx.shadowBlur = 0
  }
  ctx.lineCap = 'round'
  ctx.lineWidth = 2

  for (let i = 0; i < barCount; i++) {
    const rawValue = raw[i * step] ?? 0
    const targetH = (rawValue / 255) * maxBarHeight
    previousHeights[i] =
      previousHeights[i] + (targetH - previousHeights[i]) * smoothing
    const barH = Math.max(1.5, previousHeights[i])

    const { x, y, nx, ny } = perimeterPts[i]

    ctx.strokeStyle = getBarColor(
      i / barCount,
      colorStart,
      colorEnd,
      hueInterpolation,
    )

    if (barDirection === 'outward' || barDirection === 'both') {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + nx * barH, y + ny * barH)
      ctx.stroke()
    }

    if (barDirection === 'inward' || barDirection === 'both') {
      const innerScale = barDirection === 'both' ? 0.6 : 1
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - nx * barH * innerScale, y - ny * barH * innerScale)
      ctx.stroke()
    }
  }

  ctx.restore()
}
