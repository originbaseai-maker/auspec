import type { ShapeLayerConfig, ShapePoint } from '@/types/layer'
import type { FrequencyData } from '@/types/analyzer'

/**
 * Per-config rotation accumulator. WeakMap auto-cleans when the layer
 * (and therefore its config object) is GC'd.
 */
const rotationByConfig = new WeakMap<
  ShapeLayerConfig,
  { rotation: number; lastTime: number }
>()

const imageCache = new Map<string, HTMLImageElement>()

function getImage(src: string): HTMLImageElement {
  let img = imageCache.get(src)
  if (!img) {
    img = new Image()
    img.src = src
    imageCache.set(src, img)
  }
  return img
}

/** Bounding box of points in canvas pixels. Used to map image fill. */
function pointsBBox(
  points: ShapePoint[],
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    const x = p.x * width
    const y = p.y * height
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Build the active sub-path on ctx for the shape. Smoothness blends
 * polygon edges ↔ quadratic-bezier rounding (same approach as Bloom).
 */
function buildPath(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  smoothness: number,
  closed: boolean,
): void {
  const n = pts.length
  if (n === 0) return
  ctx.beginPath()
  if (n < 3 || smoothness <= 0.001) {
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y)
    if (closed) ctx.closePath()
    return
  }
  // Smoothed: start at midpoint of last→first edge so the wrap is clean.
  const startMidX = (pts[0].x + pts[n - 1].x) / 2
  const startMidY = (pts[0].y + pts[n - 1].y) / 2
  if (closed) {
    ctx.moveTo(startMidX, startMidY)
  } else {
    ctx.moveTo(pts[0].x, pts[0].y)
  }
  const loopEnd = closed ? n : n - 1
  for (let i = 0; i < loopEnd; i++) {
    const next = (i + 1) % n
    const midX = (pts[i].x + pts[next].x) / 2
    const midY = (pts[i].y + pts[next].y) / 2
    // Lerp control point between midpoint (smoothness=0) ↔ vertex (=1).
    const ctrlX = midX + (pts[i].x - midX) * smoothness
    const ctrlY = midY + (pts[i].y - midY) * smoothness
    if (closed) {
      ctx.quadraticCurveTo(ctrlX, ctrlY, midX, midY)
    } else if (i === loopEnd - 1) {
      ctx.quadraticCurveTo(ctrlX, ctrlY, pts[next].x, pts[next].y)
    } else {
      ctx.quadraticCurveTo(ctrlX, ctrlY, midX, midY)
    }
  }
}

export function drawCustomShape(
  ctx: CanvasRenderingContext2D,
  config: ShapeLayerConfig,
  data: FrequencyData | null,
  width: number,
  height: number,
): void {
  const pts = config.points
  if (pts.length < 2) return

  // Audio-driven scale + stroke pulses (no-op when data is missing).
  const bassEnergy = data ? data.bass / 255 : 0
  const midEnergy = data ? data.mid / 255 : 0
  const baseScale = config.scale * (1 + bassEnergy * config.bassPulse)
  const strokeBoost = midEnergy * config.strokePulse * 6 // up to +6px

  // Rotation accumulator.
  const now = performance.now()
  let rotState = rotationByConfig.get(config)
  if (!rotState) {
    rotState = { rotation: 0, lastTime: now }
    rotationByConfig.set(config, rotState)
  }
  const dtSec = Math.min(0.1, (now - rotState.lastTime) / 1000)
  rotState.rotation += config.rotationSpeed * dtSec
  rotState.lastTime = now
  const totalRotationRad =
    ((config.rotation + rotState.rotation) * Math.PI) / 180

  // Centroid in canvas pixels — we transform around it so scale/rotate
  // feel natural (around the shape's own center, not the canvas origin).
  let cx = 0
  let cy = 0
  for (const p of pts) {
    cx += p.x * width
    cy += p.y * height
  }
  cx /= pts.length
  cy /= pts.length

  // Convert points to local space around the centroid for path building.
  const localPts: { x: number; y: number }[] = pts.map((p) => ({
    x: p.x * width - cx,
    y: p.y * height - cy,
  }))

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(totalRotationRad)
  ctx.scale(baseScale, baseScale)

  // Fill
  if (config.fillType !== 'none') {
    buildPath(ctx, localPts, config.smoothness, config.closed)
    ctx.globalAlpha = Math.max(0, Math.min(1, config.fillOpacity))
    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = config.fillColor
      ctx.shadowBlur = config.glowIntensity
    }

    if (config.fillType === 'color') {
      ctx.fillStyle = config.fillColor
      ctx.fill()
    } else if (config.fillType === 'gradient') {
      // Gradient runs across the shape's bbox in local (centroid-origin)
      // space, oriented by gradientAngle.
      const bbox = pointsBBox(pts, width, height)
      const localBBox = {
        minX: bbox.minX - cx,
        minY: bbox.minY - cy,
        maxX: bbox.maxX - cx,
        maxY: bbox.maxY - cy,
      }
      const ang = (config.gradientAngle * Math.PI) / 180
      const ccx = (localBBox.minX + localBBox.maxX) / 2
      const ccy = (localBBox.minY + localBBox.maxY) / 2
      const half = Math.max(
        (localBBox.maxX - localBBox.minX) / 2,
        (localBBox.maxY - localBBox.minY) / 2,
        1,
      )
      const dx = Math.cos(ang) * half
      const dy = Math.sin(ang) * half
      const grad = ctx.createLinearGradient(ccx - dx, ccy - dy, ccx + dx, ccy + dy)
      grad.addColorStop(0, config.fillColor)
      grad.addColorStop(1, config.fillColor2)
      ctx.fillStyle = grad
      ctx.fill()
    } else if (config.fillType === 'image' && config.imageSrc) {
      // Image fill: clip to the shape, then draw the image fitted to
      // the shape's bbox (cover/contain/fill).
      const img = getImage(config.imageSrc)
      if (img.complete && img.naturalWidth > 0) {
        ctx.save()
        ctx.clip()
        const bbox = pointsBBox(pts, width, height)
        const bw = bbox.maxX - bbox.minX
        const bh = bbox.maxY - bbox.minY
        // Position in local (centroid-origin) space.
        const lx = bbox.minX - cx
        const ly = bbox.minY - cy
        const imgAR = img.naturalWidth / img.naturalHeight
        const boxAR = bw / Math.max(bh, 1)
        let dx = lx
        let dy = ly
        let dw = bw
        let dh = bh
        if (config.imageFit === 'cover') {
          if (imgAR > boxAR) {
            dw = bh * imgAR
            dx = lx + (bw - dw) / 2
          } else {
            dh = bw / imgAR
            dy = ly + (bh - dh) / 2
          }
        } else if (config.imageFit === 'contain') {
          if (imgAR > boxAR) {
            dh = bw / imgAR
            dy = ly + (bh - dh) / 2
          } else {
            dw = bh * imgAR
            dx = lx + (bw - dw) / 2
          }
        }
        ctx.drawImage(img, dx, dy, dw, dh)
        ctx.restore()
      }
    }
    // Reset glow before stroke so it can run its own shadow setup.
    ctx.shadowBlur = 0
  }

  // Stroke
  if (config.strokeEnabled && config.strokeWidth + strokeBoost > 0) {
    buildPath(ctx, localPts, config.smoothness, config.closed)
    ctx.globalAlpha = Math.max(0, Math.min(1, config.strokeOpacity))
    ctx.strokeStyle = config.strokeColor
    ctx.lineWidth = config.strokeWidth + strokeBoost
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (config.glowEnabled && config.glowIntensity > 0) {
      ctx.shadowColor = config.strokeColor
      ctx.shadowBlur = config.glowIntensity
    }
    ctx.stroke()
  }

  ctx.restore()
}

/** Drop a cached image when its data URL is no longer used. */
export function clearShapeImage(src: string): void {
  imageCache.delete(src)
}
