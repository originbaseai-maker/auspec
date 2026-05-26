import type { CoverArtImage, CropMode } from '@/types/coverArt'
import {
  renderLogoInPolygon,
  type PolygonShape,
} from '@/lib/renderers/polygonSpectrum'
import { getVideoElement } from '@/lib/videoPool'

interface CoverArtRenderConfig {
  coverArtSize: number
  logoSize: number
  coverArtCropMode: CropMode
  logoCropMode: CropMode
  coverArtPosition: { x: number; y: number }
  blurredBgEnabled: boolean
  blurredBgIntensity: number
}

function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  cropMode: CropMode,
): void {
  ctx.save()

  if (cropMode === 'circle') {
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.clip()
  } else if (cropMode === 'square') {
    ctx.beginPath()
    ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.08)
    ctx.clip()
  }

  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight)
  const scaledW = img.naturalWidth * scale
  const scaledH = img.naturalHeight * scale

  ctx.drawImage(
    img,
    x - scaledW / 2,
    y - scaledH / 2,
    scaledW,
    scaledH,
  )
  ctx.restore()
}

const imageCache = new Map<string, HTMLImageElement>()

function getOrLoadImage(objectUrl: string): HTMLImageElement | null {
  if (imageCache.has(objectUrl)) return imageCache.get(objectUrl)!
  const img = new Image()
  img.onload = () => imageCache.set(objectUrl, img)
  img.src = objectUrl
  return null
}

export function renderCoverArt(
  ctx: CanvasRenderingContext2D,
  coverArt: CoverArtImage,
  logo: CoverArtImage | null,
  config: CoverArtRenderConfig,
  width: number,
  height: number,
): void {
  const {
    coverArtSize,
    logoSize,
    coverArtCropMode,
    logoCropMode,
    coverArtPosition,
    blurredBgEnabled,
    blurredBgIntensity,
  } = config

  const img = getOrLoadImage(coverArt.objectUrl)
  if (!img) return

  const minDim = Math.min(width, height)
  const artSize = minDim * coverArtSize
  const cx = width * coverArtPosition.x
  const cy = height * coverArtPosition.y

  if (blurredBgEnabled) {
    ctx.save()
    ctx.filter = `blur(${blurredBgIntensity}px) brightness(0.4)`
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight)
    const bw = img.naturalWidth * scale
    const bh = img.naturalHeight * scale
    ctx.drawImage(img, (width - bw) / 2, (height - bh) / 2, bw, bh)
    ctx.filter = 'none'
    ctx.restore()
  }

  drawCroppedImage(ctx, img, cx, cy, artSize, coverArtCropMode)

  ctx.save()
  ctx.shadowBlur = 20
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  if (coverArtCropMode === 'circle') {
    ctx.beginPath()
    ctx.arc(cx, cy, artSize / 2, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  ctx.restore()

  if (logo) {
    const logoImg = getOrLoadImage(logo.objectUrl)
    if (logoImg) {
      const logoSizePx = minDim * logoSize
      const logoX = cx + artSize / 2 - logoSizePx * 0.6
      const logoY = cy + artSize / 2 - logoSizePx * 0.6
      drawCroppedImage(ctx, logoImg, logoX, logoY, logoSizePx, logoCropMode)
    }
  }
}

export interface LogoOnlyConfig {
  logoSize: number
  logoCropMode: CropMode
  coverArtPosition: { x: number; y: number }
  /** When set, the logo is clipped to this polygon shape instead of cropped to a circle/square. */
  polygonShape?: PolygonShape
  /** Polygon rotation in degrees (matches the spectrum renderer). */
  polygonRotation?: number
  /**
   * Polygon radius in pixels — pre-scaled by the caller so it lines up with
   * the spectrum's bars. If omitted, defaults to 35% of min(width, height).
   */
  polygonRadius?: number
}

export function renderLogoOnly(
  ctx: CanvasRenderingContext2D,
  logo: CoverArtImage,
  config: LogoOnlyConfig,
  width: number,
  height: number,
): void {
  const logoImg = getOrLoadImage(logo.objectUrl)
  if (!logoImg) return

  const minDim = Math.min(width, height)

  // Polygon clip mode: spectrum's polygon outline doubles as the logo mask.
  // Anchor at canvas center so it aligns with renderPolygonSpectrum (which
  // also centers on width/2, height/2).
  if (config.polygonShape) {
    const polyRadius = config.polygonRadius ?? minDim * 0.35
    ctx.save()
    ctx.shadowBlur = 20
    ctx.shadowColor = 'rgba(59,130,246,0.3)'
    renderLogoInPolygon(
      ctx,
      logoImg,
      config.polygonShape,
      width / 2,
      height / 2,
      polyRadius,
      config.polygonRotation ?? 0,
    )
    ctx.restore()
    return
  }

  // Default circle/square/none crop centered on user-defined position.
  const logoSizePx = minDim * config.logoSize
  const cx = width * config.coverArtPosition.x
  const cy = height * config.coverArtPosition.y

  ctx.save()
  ctx.shadowBlur = 30
  ctx.shadowColor = 'rgba(59,130,246,0.4)'
  drawCroppedImage(ctx, logoImg, cx, cy, logoSizePx, config.logoCropMode)
  ctx.shadowBlur = 0
  ctx.restore()
}

export function clearImageCache(objectUrl: string): void {
  imageCache.delete(objectUrl)
}

/**
 * Per-layer logo entry point. Reads the shared logo image from
 * `useCoverArtStore` and renders it at the layer-specific position +
 * size. If no logo is uploaded the layer is silently skipped.
 *
 * V1 behavior: all logo layers share the same uploaded image (single
 * upload point). Layer config independently controls placement/size.
 */
export interface LogoLayerRenderConfig {
  logoSize: number
  logoCropMode: CropMode
  position: { x: number; y: number }
  /** Optional video override — when set, drawn instead of the image. */
  videoAssetId?: string | null
}

/**
 * Draws a video into the logo slot using the same crop / center-crop
 * geometry as the image branch. Lets the LogoLayer "video instead of
 * image" feature reuse the existing slot semantics.
 */
function drawCroppedVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  size: number,
  cropMode: CropMode,
): void {
  ctx.save()
  if (cropMode === 'circle') {
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.clip()
  } else if (cropMode === 'square') {
    ctx.beginPath()
    ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.08)
    ctx.clip()
  }
  const vw = video.videoWidth || 1
  const vh = video.videoHeight || 1
  const scale = Math.max(size / vw, size / vh)
  const scaledW = vw * scale
  const scaledH = vh * scale
  ctx.drawImage(video, x - scaledW / 2, y - scaledH / 2, scaledW, scaledH)
  ctx.restore()
}

export function drawLogoLayer(
  ctx: CanvasRenderingContext2D,
  logo: CoverArtImage | null,
  config: LogoLayerRenderConfig,
  width: number,
  height: number,
): void {
  const minDim = Math.min(width, height)
  const logoSizePx = minDim * config.logoSize
  const cx = width * config.position.x
  const cy = height * config.position.y

  // Video wins if assigned and ready, even if a cover-art image is set.
  if (config.videoAssetId) {
    const video = getVideoElement(config.videoAssetId)
    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      ctx.save()
      ctx.shadowBlur = 30
      ctx.shadowColor = 'rgba(59,130,246,0.4)'
      drawCroppedVideo(ctx, video, cx, cy, logoSizePx, config.logoCropMode)
      ctx.shadowBlur = 0
      ctx.restore()
      return
    }
    // Video assigned but not ready yet → fall through to image, or nothing.
  }

  if (!logo) return
  const logoImg = getOrLoadImage(logo.objectUrl)
  if (!logoImg) return

  ctx.save()
  ctx.shadowBlur = 30
  ctx.shadowColor = 'rgba(59,130,246,0.4)'
  drawCroppedImage(ctx, logoImg, cx, cy, logoSizePx, config.logoCropMode)
  ctx.shadowBlur = 0
  ctx.restore()
}
