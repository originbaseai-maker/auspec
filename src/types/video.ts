export type VideoSyncMode = 'loop' | 'music_sync'

export interface VideoAsset {
  id: string
  name: string
  /** Object URL (blob:…) created from File. Revoked on removeAsset. */
  src: string
  sizeBytes: number
  /** Seconds, probed via a temporary <video> on add. 0 if probe failed. */
  duration: number
  /** Optional thumbnail data URL — not generated in V1. */
  thumbnailSrc?: string
  uploadedAt: number
}

/** Soft cap per uploaded video — keeps blob URLs from blowing the tab. */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024
