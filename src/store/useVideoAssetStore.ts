import { create } from 'zustand'
import { MAX_VIDEO_BYTES, type VideoAsset } from '@/types/video'

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `va-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface VideoAssetStore {
  assets: VideoAsset[]

  /** Upload a video file; returns its asset id (or null on validation fail). */
  addAsset: (file: File) => Promise<string | null>
  removeAsset: (id: string) => void
  renameAsset: (id: string, name: string) => void
  getAsset: (id: string) => VideoAsset | undefined
}

export const useVideoAssetStore = create<VideoAssetStore>((set, get) => ({
  assets: [],

  addAsset: async (file) => {
    if (!file.type.startsWith('video/')) {
      alert('Please pick a video file (MP4, WebM, MOV).')
      return null
    }
    if (file.size > MAX_VIDEO_BYTES) {
      alert(
        `Video too large (max ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB).`,
      )
      return null
    }

    const id = makeId()
    const src = URL.createObjectURL(file)

    // Probe duration via a throwaway <video> so the UI can show length
    // straight after upload. Resolves to 0 if the browser can't read
    // metadata within 5 s (e.g. unsupported codec).
    const duration = await new Promise<number>((resolve) => {
      const probe = document.createElement('video')
      probe.preload = 'metadata'
      probe.muted = true
      let settled = false
      const finish = (d: number) => {
        if (settled) return
        settled = true
        try {
          probe.removeAttribute('src')
          probe.load()
        } catch {
          /* ignore */
        }
        resolve(d)
      }
      probe.onloadedmetadata = () => finish(probe.duration || 0)
      probe.onerror = () => finish(0)
      setTimeout(() => finish(0), 5000)
      probe.src = src
    })

    const asset: VideoAsset = {
      id,
      name: file.name.replace(/\.[^.]+$/, ''),
      src,
      sizeBytes: file.size,
      duration,
      uploadedAt: Date.now(),
    }

    set((s) => ({ assets: [...s.assets, asset] }))
    return id
  },

  removeAsset: (id) =>
    set((s) => {
      const asset = s.assets.find((a) => a.id === id)
      if (asset?.src.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(asset.src)
        } catch {
          /* ignore — already revoked */
        }
      }
      return { assets: s.assets.filter((a) => a.id !== id) }
    }),

  renameAsset: (id, name) =>
    set((s) => ({
      assets: s.assets.map((a) =>
        a.id === id ? { ...a, name: name.trim() || a.name } : a,
      ),
    })),

  getAsset: (id) => get().assets.find((a) => a.id === id),
}))
