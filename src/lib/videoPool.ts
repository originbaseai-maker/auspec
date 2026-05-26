/**
 * Module-level pool of HTMLVideoElement instances keyed by VideoAsset id.
 * VisualizerCanvas owns the lifecycle (create-on-asset-add /
 * destroy-on-asset-remove). Renderers read via getVideoElement(id) and
 * paint the current frame to the canvas via drawImage(video, …).
 */

const pool = new Map<string, HTMLVideoElement>()

export function getVideoElement(
  assetId: string | null | undefined,
): HTMLVideoElement | null {
  if (!assetId) return null
  return pool.get(assetId) ?? null
}

export function setVideoElement(
  assetId: string,
  video: HTMLVideoElement,
): void {
  pool.set(assetId, video)
}

export function removeVideoElement(assetId: string): void {
  const v = pool.get(assetId)
  if (v) {
    try {
      v.pause()
      v.removeAttribute('src')
      v.load()
    } catch {
      /* ignore — element already in some torn-down state */
    }
  }
  pool.delete(assetId)
}

export function getAllVideoElements(): HTMLVideoElement[] {
  return Array.from(pool.values())
}

export function getPoolEntries(): Array<[string, HTMLVideoElement]> {
  return Array.from(pool.entries())
}
