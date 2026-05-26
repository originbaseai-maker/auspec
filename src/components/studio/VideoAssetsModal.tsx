import { useEffect, useRef, type JSX } from 'react'
import { Film, Plus, Trash2, X } from 'lucide-react'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import { useLayerStore } from '@/store/useLayerStore'
import { MAX_VIDEO_BYTES } from '@/types/video'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Videos modal — single tab. Upload, name, see which layers reference
 * each video, remove. V1 storage is non-persistent: videos die on page
 * reload (blob URLs don't survive). Footer text makes that explicit.
 */
export function VideoAssetsModal({ open, onClose }: Props): JSX.Element | null {
  const assets = useVideoAssetStore((s) => s.assets)
  const addAsset = useVideoAssetStore((s) => s.addAsset)
  const removeAsset = useVideoAssetStore((s) => s.removeAsset)
  const renameAsset = useVideoAssetStore((s) => s.renameAsset)
  const layers = useLayerStore((s) => s.layers)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  // For each video, find every layer that points at it (standalone +
  // container fills). Drives the "Connected to" badges so users can see
  // at a glance which layers will break if they delete a video.
  const getConnectedLayers = (videoId: string) =>
    layers.filter((l) => {
      if (l.type === 'video' && l.config.videoAssetId === videoId) return true
      if (l.type === 'shape') {
        const cfg = l.config
        return cfg.fillType === 'video' && cfg.videoAssetId === videoId
      }
      if (l.type === 'logo') {
        return l.config.videoAssetId === videoId
      }
      if (l.type === 'circular' || l.type === 'polygon') {
        const cfg = l.config
        return !!cfg.videoFillEnabled && cfg.videoFillAssetId === videoId
      }
      return false
    })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) await addAsset(file)
  }

  const formatBytes = (n: number): string => {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
    return `${(n / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Videos"
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[85vh] rounded-2xl border bg-[#0a0a0a] shadow-2xl flex flex-col"
        style={{ borderColor: '#2a2a2a' }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: '#1a1a1a' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
              aria-hidden="true"
            >
              <Film className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Videos</h3>
              <p className="text-[10px] text-white/40">
                {assets.length} {assets.length === 1 ? 'video' : 'videos'} ·
                not saved between sessions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleUpload}
            className="sr-only"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 text-[12px] text-white/60 hover:text-white hover:border-purple-400/40"
            style={{ borderColor: '#2a2a2a' }}
          >
            <Plus className="h-4 w-4" />
            Upload video (MP4 / WebM / MOV, max {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB)
          </button>

          {assets.length === 0 && (
            <p className="text-center text-[12px] text-white/40 py-8">
              No videos yet. Upload one to use as a layer or as a container fill.
            </p>
          )}

          {assets.map((asset) => {
            const connected = getConnectedLayers(asset.id)
            return (
              <div
                key={asset.id}
                className="rounded-lg border p-3"
                style={{ borderColor: '#1f1f1f', background: '#0f0f0f' }}
              >
                <div className="flex gap-3">
                  <video
                    src={asset.src}
                    muted
                    playsInline
                    className="w-32 h-20 rounded bg-black object-cover"
                    onLoadedData={(e) => {
                      // Seek a tiny way in so the poster frame isn't black.
                      try {
                        ;(e.currentTarget as HTMLVideoElement).currentTime = 0.1
                      } catch {
                        /* ignore */
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={asset.name}
                      onChange={(e) => renameAsset(asset.id, e.target.value)}
                      className="w-full bg-transparent text-[13px] font-medium text-white outline-none"
                      aria-label={`Rename ${asset.name}`}
                    />
                    <p className="mt-0.5 text-[10px] text-white/40">
                      {asset.duration > 0 ? `${asset.duration.toFixed(1)}s · ` : ''}
                      {formatBytes(asset.sizeBytes)}
                    </p>
                    {connected.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {connected.map((l) => (
                          <span
                            key={l.id}
                            className="rounded-full px-2 py-0.5 text-[9px]"
                            style={{
                              background: 'rgba(139,92,246,0.15)',
                              color: '#c4b5fd',
                            }}
                          >
                            → {l.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[9px] text-white/30">
                        Not connected to any layer
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAsset(asset.id)}
                    className="self-start flex h-7 w-7 items-center justify-center rounded text-white/40 hover:text-red-400"
                    aria-label={`Remove ${asset.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default VideoAssetsModal
