import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import { useCoverArtStore } from '@/store/useCoverArtStore'
import {
  detectFormat,
  isValidAudioFile,
  MAX_FILE_SIZE as MAX_AUDIO_SIZE,
} from '@/types/audio'
import {
  isValidImageFile,
  loadImageFile,
  MAX_IMAGE_SIZE,
} from '@/types/coverArt'

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

export function GlobalDropZone({ children }: { children: ReactNode }) {
  const setAudioFile = useAudioStore((s) => s.setAudioFile)
  const setCoverArt = useCoverArtStore((s) => s.setCoverArt)
  const setLogo = useCoverArtStore((s) => s.setLogo)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const reset = useCallback(() => {
    dragDepth.current = 0
    setIsDragging(false)
  }, [])

  const handleFiles = useCallback(
    async (files: FileList) => {
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
        } else if (category === 'image') {
          if (!isValidImageFile(file)) continue
          if (file.size > MAX_IMAGE_SIZE) continue
          try {
            const image = await loadImageFile(file)
            // First image → cover art; subsequent → logo
            const currentCover = useCoverArtStore.getState().coverArt
            if (!currentCover) setCoverArt(image)
            else setLogo(image)
          } catch {
            /* ignore unreadable image */
          }
        }
        // video: future phase
      }
    },
    [setAudioFile, setCoverArt, setLogo],
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
              Audio → music player · Image → cover art · second image → logo overlay
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default GlobalDropZone
