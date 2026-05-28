import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import {
  detectFormat,
  isValidAudioFile,
  MAX_FILE_SIZE as MAX_AUDIO_SIZE,
} from '@/types/audio'
import { isValidImageFile, MAX_IMAGE_SIZE } from '@/types/coverArt'
import { MAX_VIDEO_BYTES } from '@/types/video'
import type { Layer } from '@/types/layer'
import {
  DropTargetDialog,
  type DropTargetChoice,
  type DropTargetOption,
} from './DropTargetDialog'

type FileCategory = 'audio' | 'image' | 'video' | 'unknown'

function getFileCategory(file: File): FileCategory {
  if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|flac)$/i.test(file.name)) return 'audio'
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name)) return 'image'
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name)) return 'video'
  return 'unknown'
}

async function loadAudioDuration(objectUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(objectUrl)
    audio.onloadedmetadata = () => resolve(audio.duration || 0)
    audio.onerror = () => resolve(0)
  })
}

interface PendingDrop {
  file: File
  category: 'image' | 'video'
  /** Object URL for the file; the dialog routes use it. Revoked on cancel. */
  objectUrl: string
}

/**
 * Route a dropped image into a Background layer's imageSrc. Topmost
 * existing Background layer wins; if none, a new Background layer is
 * created. Going through the layer config (not the global cover-art
 * store) is what makes the asset PER-PRESET — the layer snapshots
 * with the preset; the cover-art store does not.
 */
function routeImageToBackground(objectUrl: string): void {
  const store = useLayerStore.getState()
  const existing = store.layers
    .filter((l) => l.type === 'background')
    .sort((a, b) => b.zOrder - a.zOrder)[0]
  if (existing) {
    store.updateConfig(existing.id, {
      bgType: 'image',
      imageSrc: objectUrl,
    })
    store.setActiveLayer(existing.id)
    return
  }
  const id = store.addLayerImmediate('background')
  store.updateConfig(id, { bgType: 'image', imageSrc: objectUrl })
}

/**
 * Route a dropped image into a Logo layer's per-layer imageSrc.
 * Topmost existing Logo layer wins; if none, a new Logo layer is
 * created. The per-layer `imageSrc` overrides the legacy global
 * cover-art logo at render time (see drawLogoLayer), so the asset
 * stays preset-scoped.
 */
function routeImageToLogo(objectUrl: string): void {
  const store = useLayerStore.getState()
  const existing = store.layers
    .filter((l) => l.type === 'logo')
    .sort((a, b) => b.zOrder - a.zOrder)[0]
  if (existing) {
    store.updateConfig(existing.id, { imageSrc: objectUrl })
    store.setActiveLayer(existing.id)
    return
  }
  const id = store.addLayerImmediate('logo')
  store.updateConfig(id, { imageSrc: objectUrl })
}

/**
 * Register a dropped video in the asset pool, then create a Video
 * layer that references it. When `asBackground` is true the new
 * layer is shifted to zOrder = 0 so it renders FIRST (behind every
 * other layer) — matches the "full-bleed animated background" feel
 * without needing a new BackgroundLayer video branch.
 */
async function routeVideoToLayer(
  file: File,
  asBackground: boolean,
): Promise<void> {
  const assetStore = useVideoAssetStore.getState()
  const assetId = await assetStore.addAsset(file)
  if (!assetId) return
  const layerStore = useLayerStore.getState()
  const newId = layerStore.addLayerImmediate('video')
  layerStore.updateConfig(newId, { videoAssetId: assetId })
  if (!asBackground) return

  // Push to the bottom of the stack. Re-pack zOrders so the move is
  // both visible AND keeps the dense 0..N-1 invariant the sidebar
  // depends on for chevron edges.
  const layers = layerStore.layers
  const target = layers.find((l) => l.id === newId)
  if (!target) return
  const others = layers
    .filter((l) => l.id !== newId)
    .sort((a, b) => a.zOrder - b.zOrder)
  const repacked: Layer[] = [
    { ...target, zOrder: 0 } as Layer,
    ...others.map((l, i) => ({ ...l, zOrder: i + 1 }) as Layer),
  ]
  layerStore.replaceLayers(repacked, newId)
}

export function GlobalDropZone({ children }: { children: ReactNode }) {
  const setAudioFile = useAudioStore((s) => s.setAudioFile)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [pending, setPending] = useState<PendingDrop | null>(null)

  const reset = useCallback(() => {
    dragDepth.current = 0
    setIsDragging(false)
  }, [])

  const handleFiles = useCallback(
    async (files: FileList) => {
      // Process audio synchronously up-front; queue the first image
      // or video for the picker. Bulk drops with multiple visual
      // assets are uncommon — taking the first keeps the picker
      // single-target and matches user intent (drop one, choose one).
      let queuedVisual: PendingDrop | null = null
      for (const file of Array.from(files)) {
        const category = getFileCategory(file)
        if (category === 'audio') {
          if (!isValidAudioFile(file)) continue
          if (file.size > MAX_AUDIO_SIZE) continue
          const objectUrl = URL.createObjectURL(file)
          const duration = await loadAudioDuration(objectUrl)
          setAudioFile({
            file,
            name: file.name,
            duration,
            size: file.size,
            format: detectFormat(file),
            objectUrl,
          })
        } else if (category === 'image' && !queuedVisual) {
          if (!isValidImageFile(file)) continue
          if (file.size > MAX_IMAGE_SIZE) continue
          queuedVisual = {
            file,
            category: 'image',
            objectUrl: URL.createObjectURL(file),
          }
        } else if (category === 'video' && !queuedVisual) {
          if (!file.type.startsWith('video/')) continue
          if (file.size > MAX_VIDEO_BYTES) continue
          queuedVisual = {
            file,
            category: 'video',
            objectUrl: URL.createObjectURL(file),
          }
        }
      }
      if (queuedVisual) setPending(queuedVisual)
    },
    [setAudioFile],
  )

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      dragDepth.current += 1
      setIsDragging(true)
    }
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setIsDragging(false)
    }
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      reset()
      if (e.dataTransfer?.files?.length) {
        void handleFiles(e.dataTransfer.files)
      }
    }
    const onDragEnd = () => reset()

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragend', onDragEnd)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragend', onDragEnd)
    }
  }, [handleFiles, reset])

  const handlePick = useCallback(
    async (choice: DropTargetChoice) => {
      if (!pending) return
      const { file, category, objectUrl } = pending
      try {
        if (category === 'image') {
          if (choice === 'background') {
            routeImageToBackground(objectUrl)
          } else if (choice === 'logo') {
            routeImageToLogo(objectUrl)
          }
        } else {
          // Video: route through the asset pool so the existing video
          // renderer + sync pipeline lights up automatically. The
          // asset store creates its own object URL, so we revoke the
          // dialog's transient one.
          await routeVideoToLayer(file, choice === 'video_background')
          try {
            URL.revokeObjectURL(objectUrl)
          } catch {
            /* ignore */
          }
        }
      } finally {
        setPending(null)
      }
    },
    [pending],
  )

  const handleCancel = useCallback(() => {
    if (pending) {
      // Releasing the object URL is cheap insurance against a leak
      // when the user repeatedly drop-and-cancels.
      try {
        URL.revokeObjectURL(pending.objectUrl)
      } catch {
        /* ignore */
      }
    }
    setPending(null)
  }, [pending])

  const options: DropTargetOption[] = pending
    ? pending.category === 'image'
      ? [
          {
            choice: 'background',
            label: 'Background',
            hint: 'Fills the whole stage',
            icon: 'background',
          },
          {
            choice: 'logo',
            label: 'Logo',
            hint: 'Centered overlay',
            icon: 'logo',
          },
        ]
      : [
          {
            choice: 'video_background',
            label: 'Background',
            hint: 'Full-bleed animated background',
            icon: 'background',
          },
          {
            choice: 'video_layer',
            label: 'Video Layer',
            hint: 'Add as a contained, positionable video',
            icon: 'film',
          },
        ]
    : []

  return (
    <>
      {children}
      {isDragging && (
        <div
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
          aria-hidden="true"
          style={{
            background: 'rgba(0,0,0,0.7)',
            border: '2px dashed #3b82f6',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-5xl">⬇</div>
            <p className="text-xl font-semibold text-white">Drop anywhere</p>
            <p className="text-sm text-white/60">
              Audio → music player · Image / Video → pick a target
            </p>
          </div>
        </div>
      )}
      {pending && (
        <DropTargetDialog
          fileName={pending.file.name}
          options={options}
          onPick={handlePick}
          onCancel={handleCancel}
        />
      )}
    </>
  )
}

export default GlobalDropZone
