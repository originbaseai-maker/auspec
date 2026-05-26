import type { VideoLayerConfig } from '@/types/layer'
import { getVideoElement } from '@/lib/videoPool'

/**
 * Standalone Video Layer renderer. Fits the video into the canvas using
 * cover / contain / fill semantics (same as Background image), then
 * applies the user's transform (scale, rotation, X/Y offset) around the
 * canvas center.
 *
 * No audio data is required — video renders whenever a frame is ready.
 * Playback / seek / pause is driven by VisualizerCanvas's audio-sync
 * effect, NOT here. This function just paints whatever frame the
 * HTMLVideoElement currently holds.
 */
export function drawVideoLayer(
  ctx: CanvasRenderingContext2D,
  config: VideoLayerConfig,
  width: number,
  height: number,
): void {
  if (!config.videoAssetId) return
  const video = getVideoElement(config.videoAssetId)
  // HAVE_CURRENT_DATA = 2; below that, drawImage would paint a black
  // frame on some browsers or throw on others.
  if (!video || video.readyState < 2) return

  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return

  const vAR = vw / vh
  const cAR = width / Math.max(height, 1)

  // Base box = full canvas; cover/contain center-crop the short axis.
  let dw = width
  let dh = height
  let dx = 0
  let dy = 0

  if (config.fit === 'cover') {
    if (vAR > cAR) {
      dw = height * vAR
      dx = (width - dw) / 2
    } else {
      dh = width / vAR
      dy = (height - dh) / 2
    }
  } else if (config.fit === 'contain') {
    if (vAR > cAR) {
      dh = width / vAR
      dy = (height - dh) / 2
    } else {
      dw = height * vAR
      dx = (width - dw) / 2
    }
  }
  // 'fill' uses dw = width, dh = height (stretch).

  // Position offset in canvas pixels — only meaningful when fit !== 'fill'
  // (when fill, the video already covers everything).
  const offX = (config.offsetX - 0.5) * width
  const offY = (config.offsetY - 0.5) * height

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(config.scale, config.scale)
  ctx.rotate((config.rotation * Math.PI) / 180)
  // Translate dest so the box sits centered around the canvas center,
  // then apply X/Y offset to shift it within the canvas.
  ctx.drawImage(video, dx - width / 2 + offX, dy - height / 2 + offY, dw, dh)
  ctx.restore()
}
