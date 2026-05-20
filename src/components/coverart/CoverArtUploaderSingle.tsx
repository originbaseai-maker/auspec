import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { AlertCircle, Award, Image as ImageIcon, X } from 'lucide-react'
import { useCoverArtStore } from '@/store/useCoverArtStore'
import {
  isValidImageFile,
  loadImageFile,
  MAX_IMAGE_SIZE,
  type CoverArtImage,
} from '@/types/coverArt'

const ACCEPT_ATTR =
  'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif'
const MAX_SIZE_LABEL = '10MB'

type ZoneState =
  | { kind: 'idle' }
  | { kind: 'dragover' }
  | { kind: 'error'; message: string }

type SlotType = 'coverart' | 'logo'

interface Props {
  type: SlotType
}

const SLOT_CONFIG: Record<
  SlotType,
  { label: string; icon: typeof ImageIcon; shape: 'circle' | 'square' }
> = {
  coverart: { label: 'Cover Art', icon: ImageIcon, shape: 'circle' },
  logo: { label: 'Logo', icon: Award, shape: 'square' },
}

export default function CoverArtUploaderSingle({ type }: Props): JSX.Element {
  const { label, icon: Icon, shape } = SLOT_CONFIG[type]
  const item = useCoverArtStore((s) =>
    type === 'coverart' ? s.coverArt : s.logo,
  )
  const setItem = useCoverArtStore((s) =>
    type === 'coverart' ? s.setCoverArt : s.setLogo,
  )

  const [state, setState] = useState<ZoneState>({ kind: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const errorTimer = useRef<number | null>(null)

  const setError = useCallback((message: string) => {
    setState({ kind: 'error', message })
    if (errorTimer.current !== null) window.clearTimeout(errorTimer.current)
    errorTimer.current = window.setTimeout(() => {
      setState({ kind: 'idle' })
      errorTimer.current = null
    }, 4000)
  }, [])

  useEffect(
    () => () => {
      if (errorTimer.current !== null) window.clearTimeout(errorTimer.current)
    },
    [],
  )

  const handleFile = useCallback(
    async (file: File) => {
      if (!isValidImageFile(file)) {
        setError('Use JPG, PNG, WEBP, or GIF.')
        return
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`Too large. Max ${MAX_SIZE_LABEL}.`)
        return
      }
      try {
        const image: CoverArtImage = await loadImageFile(file)
        setItem(image)
        setState({ kind: 'idle' })
      } catch {
        setError('Could not read image.')
      }
    },
    [setItem, setError],
  )

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current += 1
    if (state.kind === 'idle' || state.kind === 'error') {
      setState({ kind: 'dragover' })
    }
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0 && state.kind === 'dragover') {
      setState({ kind: 'idle' })
    }
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepth.current = 0
    const file = e.dataTransfer?.files?.[0]
    if (file) void handleFile(file)
    else setState({ kind: 'idle' })
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  const openPicker = () => inputRef.current?.click()
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  const onRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setItem(null)
  }

  const isDragOver = state.kind === 'dragover'
  const isError = state.kind === 'error'
  const baseBorder = '#2a2a2a'
  const activeBorder = '#3b82f6'
  const errorBorder = '#ef4444'
  const borderColor = isError ? errorBorder : isDragOver ? activeBorder : baseBorder
  const thumbRounded = shape === 'circle' ? 'rounded-full' : 'rounded-md'

  return (
    <div className="flex w-full min-w-0 flex-col">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={onInputChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label.toLowerCase()}`}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'group relative flex h-[80px] w-full cursor-pointer items-center justify-center',
          'rounded-md border-2 border-dashed bg-[#0a0a0a]',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/60',
          !isDragOver && !isError && 'hover:border-[#3a3a3a] hover:bg-[#0f0f0f]',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          borderColor,
          boxShadow: isDragOver
            ? '0 0 28px rgba(59,130,246,0.28), inset 0 0 0 1px rgba(59,130,246,0.18)'
            : isError
              ? '0 0 18px rgba(239,68,68,0.18)'
              : 'none',
        }}
      >
        {item ? (
          <div className="flex w-full items-center gap-2 px-2">
            <img
              src={item.objectUrl}
              alt={item.file.name}
              className={`h-12 w-12 shrink-0 object-cover ${thumbRounded}`}
              style={{
                outline: '1px solid #2a2a2a',
                outlineOffset: '-1px',
              }}
            />
            <p
              className="min-w-0 flex-1 truncate text-[11px] text-white/80"
              title={item.file.name}
            >
              {item.file.name}
            </p>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${label.toLowerCase()}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-[#1a1a1a] text-white/70 transition-colors hover:bg-[#222] hover:text-white"
              style={{ borderColor: '#2a2a2a' }}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ) : isError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="flex flex-col items-center justify-center px-2 text-center"
          >
            <AlertCircle
              className="mb-1 h-4 w-4 text-[#ef4444]"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <p className="text-[10px] leading-tight text-white/70">
              {state.message}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <Icon
              className={[
                'mb-1 h-5 w-5 transition-colors duration-200',
                isDragOver ? 'text-[#3b82f6]' : 'text-white/60',
              ].join(' ')}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <p className="text-[10px] font-medium text-white/70">
              {isDragOver ? 'Drop image' : 'Upload'}
            </p>
            <p className="text-[9px] text-white/40">JPG · PNG · WEBP · GIF</p>
          </div>
        )}
      </div>
    </div>
  )
}
