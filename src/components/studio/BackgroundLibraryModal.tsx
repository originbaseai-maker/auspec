import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from 'react'
import { Film, RefreshCw, Search, X } from 'lucide-react'
import {
  CATEGORY_LABELS,
  clearBackgroundLibraryCache,
  fetchBackgroundVideos,
  type BackgroundVideo,
} from '@/lib/backgroundLibrary'

interface Props {
  open: boolean
  onClose: () => void
  /** Fired when the user picks a video. The caller wires this to the
   * Background layer config. */
  onPick: (video: BackgroundVideo) => void
}

/**
 * Browseable Supabase-backed library of stock background videos.
 * Categorised thumbnail grid + filter input; clicking a card applies
 * the video to the active Background layer and closes the modal.
 *
 * Empty-catalog state: when the owner hasn't added any videos yet,
 * the modal renders a friendly "No backgrounds yet" message rather
 * than an error. Same fallback when Supabase is misconfigured / the
 * request fails — the modal degrades gracefully so the studio
 * never crashes because the backend isn't ready.
 */
export function BackgroundLibraryModal({
  open,
  onClose,
  onPick,
}: Props): JSX.Element | null {
  const [loading, setLoading] = useState(false)
  const [library, setLibrary] = useState<{
    byCategory: Map<string, BackgroundVideo[]>
    all: BackgroundVideo[]
  }>({ byCategory: new Map(), all: [] })
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const filterInputRef = useRef<HTMLInputElement>(null)

  // Load on open, skip the network when we've already fetched.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    void fetchBackgroundVideos().then((lib) => {
      if (cancelled) return
      setLibrary({ byCategory: lib.byCategory, all: lib.all })
      // Auto-select the first category with content; null when empty.
      const first = [...lib.byCategory.keys()][0] ?? null
      setActiveCategory((curr) => curr ?? first)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  // Lock body scroll + Escape-to-close.
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

  // Visible videos respect: active category filter, free-text title
  // filter (case-insensitive substring). Free-text takes over and
  // surfaces matches from EVERY category — common search-UX
  // expectation; users typing don't want to also remember the tab.
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (q.length > 0) {
      return library.all.filter((v) => v.title.toLowerCase().includes(q))
    }
    if (!activeCategory) return []
    return library.byCategory.get(activeCategory) ?? []
  }, [library, activeCategory, filter])

  const categories = useMemo(
    () => [...library.byCategory.keys()],
    [library],
  )

  const handleRefresh = () => {
    clearBackgroundLibraryCache()
    setLoading(true)
    void fetchBackgroundVideos(true).then((lib) => {
      setLibrary({ byCategory: lib.byCategory, all: lib.all })
      setLoading(false)
    })
  }

  if (!open) return null

  const isEmpty = !loading && library.all.length === 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Background video library"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex h-[640px] max-h-[90vh] w-[840px] max-w-[95vw] flex-col rounded-xl border bg-[#111111] shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: '#2a2a2a' }}
        >
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-white/70" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">
              Background Library
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30"
                aria-hidden="true"
              />
              <input
                ref={filterInputRef}
                type="text"
                placeholder="Search…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-40 rounded-md border bg-[#1a1a1a] py-1 pl-7 pr-2 text-[11px] text-white/90 outline-none focus:border-[#3b82f6]"
                style={{ borderColor: '#2a2a2a' }}
              />
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh library"
              title="Refresh library"
              className="flex h-7 w-7 items-center justify-center rounded-md border text-white/60 hover:text-white transition-colors"
              style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
            >
              <RefreshCw
                className={
                  'h-3 w-3 ' + (loading ? 'animate-spin' : '')
                }
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md border text-white/60 hover:text-white transition-colors"
              style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Category tabs (only show categories that actually have rows) */}
        {!isEmpty && categories.length > 0 && filter.trim() === '' && (
          <div
            className="flex items-center gap-1 overflow-x-auto border-b px-4 py-2"
            style={{ borderColor: '#1f1f1f' }}
          >
            {categories.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={isActive}
                  className="shrink-0 rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors"
                  style={{
                    borderColor: isActive
                      ? 'rgba(59,130,246,0.4)'
                      : '#2a2a2a',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18))'
                      : '#1a1a1a',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              )
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-lg border animate-pulse"
                  style={{
                    borderColor: '#2a2a2a',
                    background:
                      'linear-gradient(90deg, #131313 0%, #1a1a1a 50%, #131313 100%)',
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : isEmpty ? (
            <EmptyState />
          ) : visible.length === 0 ? (
            <div
              className="flex h-full items-center justify-center text-center"
              role="status"
            >
              <p className="text-[11px] text-white/40">
                No backgrounds match this filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((v) => (
                <ThumbnailCard
                  key={v.id}
                  video={v}
                  onPick={() => {
                    onPick(v)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="border-t px-5 py-2 text-[10px] text-white/40"
          style={{ borderColor: '#1f1f1f' }}
        >
          Library videos play muted and looped as decoration. Audio
          source is unchanged.
        </div>
      </div>
    </div>
  )
}

function ThumbnailCard({
  video,
  onPick,
}: {
  video: BackgroundVideo
  onPick: () => void
}): JSX.Element {
  // Static poster thumbnails — cheap, no autoplay bandwidth waste in
  // the grid. The thumbnail's onLoad / onError is best-effort; we
  // fall back to a film-icon placeholder when no thumbnail_path
  // resolved or the image fails to load.
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = video.thumbnailUrl !== null && !imgFailed
  return (
    <button
      type="button"
      onClick={onPick}
      className="group relative aspect-video overflow-hidden rounded-lg border text-left transition-transform hover:scale-[1.02]"
      style={{ borderColor: '#2a2a2a', background: '#131313' }}
      aria-label={`Use ${video.title} as background`}
    >
      {showImage ? (
        <img
          src={video.thumbnailUrl ?? undefined}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="h-8 w-8 text-white/15" aria-hidden="true" />
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 px-2 py-1.5"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
        }}
      >
        <p className="truncate text-[10px] font-medium text-white">
          {video.title}
        </p>
        {video.durationSec !== null && (
          <p className="text-[9px] text-white/50">
            {formatDuration(video.durationSec)}
          </p>
        )}
      </div>
    </button>
  )
}

function EmptyState(): JSX.Element {
  return (
    <div
      className="flex h-full flex-col items-center justify-center text-center"
      role="status"
    >
      <Film className="mb-3 h-10 w-10 text-white/15" aria-hidden="true" />
      <p className="mb-1 text-[13px] font-medium text-white/70">
        No backgrounds available yet
      </p>
      <p className="max-w-[320px] text-[11px] text-white/40">
        The stock library hasn't been populated yet. Check back soon —
        new backgrounds are added regularly.
      </p>
    </div>
  )
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default BackgroundLibraryModal
