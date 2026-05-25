import type { BackgroundLayerConfig } from '@/types/layer'

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
