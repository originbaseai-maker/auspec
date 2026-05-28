import type { BackgroundLayerConfig } from '@/types/layer'
import { getOrLoadLibraryVideo } from '@/lib/libraryVideoPool'

/**
 * Background layer renderer. Each layer can be a solid color, a linear
 * gradient at any angle, a fitted/cover/contain image, or fully
 * transparent. Drawn early in the layer loop (lowest z-order) so the
 * rest of the stack sits on top.
 *
 * Multiple background layers stack via globalAlpha — useful for
 * "color base + gradient overlay + image" combos.
 */

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

export function drawBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  config: BackgroundLayerConfig,
  width: number,
  height: number,
  /**
   * Normalised 0..1 bass energy. Only consumed when the layer is a
   * video background with `videoReactEnabled`. The caller's per-
   * frame audio extraction (VisualizerCanvas) is the same value the
   * Frame layer reads, so the background pulse stays in lockstep
   * with the rest of the bass-driven UI.
   */
  bassEnergy = 0,
): void {
  if (config.bgType === 'transparent') return

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, config.opacity))

  if (config.bgType === 'color') {
    ctx.fillStyle = config.color
    ctx.fillRect(0, 0, width, height)
  } else if (config.bgType === 'gradient') {
    const angleRad = (config.gradientAngle * Math.PI) / 180
    const dx = Math.cos(angleRad)
    const dy = Math.sin(angleRad)
    const halfDiag = Math.sqrt(width * width + height * height) / 2
    const x1 = width / 2 - dx * halfDiag
    const y1 = height / 2 - dy * halfDiag
    const x2 = width / 2 + dx * halfDiag
    const y2 = height / 2 + dy * halfDiag
    const grad = ctx.createLinearGradient(x1, y1, x2, y2)
    grad.addColorStop(0, config.color)
    grad.addColorStop(1, config.color2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
  } else if (config.bgType === 'video' && config.videoSrc) {
    const video = getOrLoadLibraryVideo(config.videoSrc)
    if (video.readyState >= 2 && video.videoWidth > 0) {
      // Cover-fit: scale up so the shorter axis matches the canvas,
      // crop the longer one. Same math the Image branch uses for the
      // 'cover' mode — kept inline so this branch stays self-contained.
      const vw = video.videoWidth
      const vh = video.videoHeight
      const ratio = Math.max(width / vw, height / vh)
      const drawW = vw * ratio
      const drawH = vh * ratio
      const dx = (width - drawW) / 2
      const dy = (height - drawH) / 2

      // Audio reactivity — opacity multiply + tiny scale-up. NEVER
      // touch playbackRate (that desyncs the loop and breaks
      // captureStream exports). Both effects are deliberately
      // small-amplitude: max ~4% scale and ~10% alpha swing even at
      // intensity = 1. A pumping background fights the visualiser.
      let scale = 1
      let alphaMul = 1
      if (config.videoReactEnabled) {
        const intensity = Math.max(
          0,
          Math.min(1, config.videoReactIntensity ?? 0.5),
        )
        const e = Math.max(0, Math.min(1, bassEnergy))
        scale = 1 + e * 0.04 * intensity
        alphaMul = 1 - e * 0.1 * intensity
      }

      if (config.blur > 0) {
        ctx.filter = `blur(${config.blur}px)`
      }
      ctx.save()
      ctx.globalAlpha = ctx.globalAlpha * alphaMul
      if (scale !== 1) {
        ctx.translate(width / 2, height / 2)
        ctx.scale(scale, scale)
        ctx.translate(-width / 2, -height / 2)
      }
      ctx.drawImage(video, dx, dy, drawW, drawH)
      ctx.restore()
    }
  } else if (config.bgType === 'image' && config.imageSrc) {
    const img = getImage(config.imageSrc)
    if (img.complete && img.naturalWidth > 0) {
      if (config.blur > 0) {
        ctx.filter = `blur(${config.blur}px)`
      }
      const imgAR = img.naturalWidth / img.naturalHeight
      const canvasAR = width / height
      let dx = 0
      let dy = 0
      let dw = width
      let dh = height

      if (config.imageFit === 'cover') {
        // Fill canvas; crop the shorter axis.
        if (imgAR > canvasAR) {
          dw = height * imgAR
          dx = (width - dw) / 2
        } else {
          dh = width / imgAR
          dy = (height - dh) / 2
        }
      } else if (config.imageFit === 'contain') {
        // Fit fully inside canvas; letterbox the other axis.
        if (imgAR > canvasAR) {
          dh = width / imgAR
          dy = (height - dh) / 2
        } else {
          dw = height * imgAR
          dx = (width - dw) / 2
        }
      }
      // 'fill' uses dw=width, dh=height (stretches).

      ctx.drawImage(img, dx, dy, dw, dh)
    }
  }

  ctx.restore()
}

/** Drop a cached image — call when its data URL is no longer used. */
export function clearBackgroundImage(src: string): void {
  imageCache.delete(src)
}
