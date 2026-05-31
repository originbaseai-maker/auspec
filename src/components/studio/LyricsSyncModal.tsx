import { useEffect, useRef, useState, type JSX } from 'react'
import { Pause, Play, RotateCcw, SkipBack, Undo2, X } from 'lucide-react'
import { useAudioStore } from '@/store/useAudioStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useMasterClock } from '@/lib/masterClock'
import type { LyricsLayerConfig, LyricsLine } from '@/types/layer'

interface Props {
  layerId: string
  onClose: () => void
}

/**
 * Tap-to-sync flow.
 *
 *   - Lists every line of the layer's lyrics. The first un-synced
 *     line is "armed" — the next TAP assigns the current master-
 *     clock time to it, then advances the arm.
 *   - The PLAY / PAUSE control is a dedicated button (not the
 *     spacebar). Spacebar is bound to TAP — that's the most ergonomic
 *     mapping for sync work (drum on spacebar to the beat) and it
 *     avoids the usual "spacebar = play/pause" conflict on a screen
 *     where every keystroke matters.
 *   - The timeline scrubber gives a visual map of the song with the
 *     current playhead and one marker per synced line. Clicking it
 *     seeks AND arms the line at/after that time, so fixing a mistap
 *     is a single click + re-tap.
 *   - Clicking any line's timestamp seeks to that line's time and
 *     arms THAT line — the same "fix-from-here" affordance as the
 *     timeline, just per-line precise.
 *
 *   Keyboard shortcuts (modal-scoped only):
 *       Space        → TAP (assign current time to armed line)
 *       Backspace    → UNDO last sync (re-arms the previous line)
 *       R            → Rewind to start
 *       Esc          → Close modal (timings already saved)
 *
 * The modal owns no audio state of its own — it reads currentTime
 * and isPlaying from useAudioStore each frame via a small rAF poll
 * so the "Now: 0:34.20" indicator + timeline playhead stay current
 * without flooding React with re-renders per timeupdate event.
 */
export function LyricsSyncModal({ layerId, onClose }: Props): JSX.Element {
  const updateConfig = useLayerStore((s) => s.updateConfig)
  // Draft-aware lookup mirrors LyricsPanel — must match exactly so
  // a sync on a brand-new (not yet committed) layer still works.
  const layer = useLayerStore((s) => {
    if (
      s.draftLayer &&
      s.draftLayer.id === layerId &&
      s.draftLayer.type === 'lyrics'
    ) {
      return s.draftLayer
    }
    return s.layers.find((l) => l.id === layerId && l.type === 'lyrics')
  })

  // Master-clock control — works whether the user's playing audio,
  // video-as-audio, or a video-only timeline. handlePlayPause and
  // handleSeek route through whichever element is the master.
  const masterClock = useMasterClock()
  const masterElement = masterClock.element
  const isPlaying = useAudioStore((s) => s.isPlaying)
  const duration = useAudioStore((s) => s.duration)
  const setCurrentTime = useAudioStore((s) => s.setCurrentTime)

  // Live "now" indicator + timeline playhead — polled via rAF rather
  // than via Zustand subscription so the modal doesn't re-render on
  // every audio-element timeupdate event (~60/s).
  const [nowSec, setNowSec] = useState(() => useAudioStore.getState().currentTime)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      setNowSec(useAudioStore.getState().currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // History stack of timed assignments — supports Backspace = undo.
  // Stores { lineIndex, prevTime, prevManualArm } so undo restores
  // both the line's previous time AND the manual-arm state from
  // BEFORE the tap, so the user can keep retapping without state
  // dropping back to the auto-find-first-unsynced flow.
  const historyRef = useRef<
    { lineIndex: number; prevTime: number | null; prevManualArm: number | null }[]
  >([])

  // Manual arm — when set, overrides the default "first un-synced line"
  // arming rule. Set by clicking a line timestamp or the timeline bar.
  // Advances on TAP; rewinds on Undo; clears on "Discard all".
  const [manualArm, setManualArm] = useState<number | null>(null)

  // Confirmation gate for the "discard sync" / re-sync flow — opening
  // the modal on a layer that already has timestamps shows a banner
  // asking before any TAP overwrites them.
  const initialSyncedCount = useRef(0)
  useEffect(() => {
    if (!layer || layer.type !== 'lyrics') return
    initialSyncedCount.current = layer.config.lines.filter(
      (l) => l.time !== null,
    ).length
  // initialise once on open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Body scroll lock + Esc-to-close (modal hygiene matching BrandKitModal).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Auto-armed line = first non-empty line whose time is null. Empty
  // instrumental rows are skipped so the user doesn't have to TAP
  // through silence. They can still sync them manually via fine-
  // tune in the panel.
  const findAutoArmed = (lines: LyricsLine[]): number => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].text === '') continue
      if (lines[i].time === null) return i
    }
    return -1
  }

  if (!layer || layer.type !== 'lyrics') {
    return (
      <ModalShell onClose={onClose}>
        <div className="p-6 text-center text-[12px] text-white/60">
          Layer not found.
        </div>
      </ModalShell>
    )
  }

  const cfg = layer.config as LyricsLayerConfig
  const autoArmed = findAutoArmed(cfg.lines)
  // Manual arm wins when valid (in-bounds + non-empty line). If the
  // user's manualArm has walked past the end of the list, fall back
  // to auto-armed so the "All lines synced" state is reachable.
  const isValidManual =
    manualArm !== null &&
    manualArm >= 0 &&
    manualArm < cfg.lines.length &&
    cfg.lines[manualArm].text !== ''
  const armed = isValidManual ? (manualArm as number) : autoArmed
  const syncedCount = cfg.lines.filter((l) => l.time !== null).length
  const totalNonEmpty = cfg.lines.filter((l) => l.text !== '').length

  const handlePlayPause = (): void => {
    if (!masterElement) return
    if (isPlaying) {
      masterElement.pause()
    } else {
      void masterElement.play()
    }
  }

  const handleRewind = (): void => {
    if (!masterElement) return
    try {
      masterElement.currentTime = 0
    } catch {
      /* element not seekable yet */
    }
    setCurrentTime(0)
    setManualArm(null)
  }

  const seekTo = (t: number): void => {
    const clamped = Math.max(0, Math.min(duration > 0 ? duration : t, t))
    if (masterElement) {
      try {
        masterElement.currentTime = clamped
      } catch {
        /* not seekable yet */
      }
    }
    setCurrentTime(clamped)
  }

  /**
   * After a manual arm walks past an index (via TAP), find the next
   * non-empty line to arm. Returns null when there are no more
   * non-empty lines — at which point findAutoArmed takes over and
   * returns either the first un-synced line or -1 ("all synced").
   */
  const nextManualArm = (lines: LyricsLine[], fromIdx: number): number | null => {
    for (let i = fromIdx + 1; i < lines.length; i++) {
      if (lines[i].text !== '') return i
    }
    return null
  }

  /**
   * Click on a line's timestamp = "fix from here". Seeks playback to
   * that line's time (if it has one — otherwise to the line's
   * neighbour-implied position via the previous synced line + a
   * sensible offset). Arms the clicked line so the next TAP rewrites
   * it.
   */
  const handleSeekToLine = (idx: number): void => {
    const line = cfg.lines[idx]
    if (!line) return
    if (line.text === '') return
    // Preferred seek target = the line's own time. If un-synced,
    // approximate by interpolating between neighbours — better than
    // staying put because the user clearly wants to play from
    // around the click.
    let target: number | null = line.time
    if (target === null) {
      const prevSynced = findPrevSyncedTime(cfg.lines, idx)
      const nextSynced = findNextSyncedTime(cfg.lines, idx)
      if (prevSynced !== null && nextSynced !== null) {
        target = (prevSynced + nextSynced) / 2
      } else if (prevSynced !== null) {
        target = prevSynced + 1
      } else if (nextSynced !== null) {
        target = Math.max(0, nextSynced - 1)
      }
    }
    if (target !== null) seekTo(target)
    setManualArm(idx)
  }

  /**
   * Click on the timeline bar: convert pixel x → time, seek, arm the
   * line nearest at-or-after that time. If no synced line is at or
   * after, arm whichever auto-armed line is next.
   */
  const handleTimelineClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ): void => {
    if (duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const t = fraction * duration
    seekTo(t)
    // Find best match: smallest line.time >= (t - 0.5s) to allow a
    // tiny backward tolerance for clicks landing JUST before a marker.
    let best = -1
    let bestDelta = Infinity
    for (let i = 0; i < cfg.lines.length; i++) {
      const l = cfg.lines[i]
      if (l.text === '' || l.time === null) continue
      const delta = l.time - t
      if (delta >= -0.5 && delta < bestDelta) {
        bestDelta = delta
        best = i
      }
    }
    if (best >= 0) {
      setManualArm(best)
    } else {
      setManualArm(null)
    }
  }

  const handleTap = (): void => {
    if (armed < 0) return
    const t = useAudioStore.getState().currentTime
    historyRef.current.push({
      lineIndex: armed,
      prevTime: cfg.lines[armed].time,
      prevManualArm: manualArm,
    })
    const lines = cfg.lines.map((l, idx) =>
      idx === armed ? { ...l, time: t } : l,
    )
    updateConfig(layerId, { lines })
    // Advance manualArm if it was the source of the current arm so
    // the user can re-tap the next line. If we were on auto-arm,
    // findAutoArmed will pick the next un-synced line on the next
    // render — no state change needed here.
    if (isValidManual) {
      setManualArm(nextManualArm(cfg.lines, armed))
    }
  }

  const handleUndo = (): void => {
    const last = historyRef.current.pop()
    if (!last) return
    const lines = cfg.lines.map((l, idx) =>
      idx === last.lineIndex ? { ...l, time: last.prevTime } : l,
    )
    updateConfig(layerId, { lines })
    // Restore both prevManualArm AND aim the arm at the just-undone
    // line so the user can immediately retap it. The latter wins
    // whenever the undone line is non-empty (always true given how
    // taps are gated).
    setManualArm(last.lineIndex)
  }

  const handleDiscardAll = (): void => {
    if (
      syncedCount > 0 &&
      !window.confirm('Discard all synced timestamps for this layer?')
    ) {
      return
    }
    const lines = cfg.lines.map((l) => ({ ...l, time: null }))
    historyRef.current = []
    setManualArm(null)
    updateConfig(layerId, { lines })
  }

  // Modal-scoped keyboard handler. Bound to the modal root so global
  // shortcuts elsewhere on the page aren't affected. We register on
  // window because the modal may not have focus when the user first
  // hits a key — the test for "modal is open" is just our being
  // mounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when an input/textarea has focus — don't steal typing.
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        handleTap()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleUndo()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleRewind()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // handleTap captures cfg.lines / armed from current render; we
    // want the freshest closure so re-bind every render.
  })

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between border-b px-5 py-3"
           style={{ borderColor: '#222' }}>
        <h3 className="text-sm font-semibold text-white">Sync Lyrics</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Transport row */}
      <div className="flex items-center gap-3 border-b px-5 py-3"
           style={{ borderColor: '#1a1a1a' }}>
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={!masterElement}
          className="flex h-9 w-20 items-center justify-center gap-1 rounded-md text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30"
          style={{ background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)' }}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={handleRewind}
          disabled={!masterElement}
          className="flex h-9 items-center justify-center gap-1 rounded-md border bg-[#1a1a1a] px-2 text-[12px] text-white/80 hover:border-[#3b82f6] disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: '#2a2a2a' }}
          title="Rewind to start (R)"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <div className="ml-1 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Now</p>
          <p className="tabular-nums text-[15px] font-semibold text-white">
            {formatTime(nowSec)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Synced</p>
          <p className="tabular-nums text-[13px] text-white/80">
            {syncedCount}/{totalNonEmpty}
          </p>
        </div>
      </div>

      {/* Timeline scrubber: playhead + markers, click-to-seek+arm */}
      <TimelineScrubber
        nowSec={nowSec}
        duration={duration}
        lines={cfg.lines}
        armedIdx={armed}
        onClick={handleTimelineClick}
      />

      {!masterElement && (
        <div className="px-5 py-3 text-[11px] text-amber-300/90">
          Load an audio file or a video to start syncing. The modal
          stays open — pick an audio source and the transport
          activates automatically.
        </div>
      )}

      {initialSyncedCount.current > 0 && syncedCount > 0 && manualArm === null && (
        <div className="border-b px-5 py-2 text-[10px] text-amber-300/80"
             style={{ borderColor: '#1a1a1a' }}>
          This layer already has {initialSyncedCount.current} timestamp{initialSyncedCount.current === 1 ? '' : 's'}.
          New taps overwrite from the first un-synced line, or click a
          timestamp / the timeline to jump anywhere.
        </div>
      )}

      {/* Line list — armed line highlighted, synced grey, future dim */}
      <div className="max-h-72 overflow-y-auto px-5 py-3">
        <ul className="space-y-0.5">
          {cfg.lines.map((line, idx) => {
            const isArmed = idx === armed
            const isSynced = line.time !== null
            const isEmpty = line.text === ''
            return (
              <li
                key={idx}
                className="flex items-center gap-3 rounded px-2 py-1 text-[12px]"
                style={{
                  background: isArmed
                    ? 'linear-gradient(90deg,rgba(59,130,246,0.15),rgba(139,92,246,0.10))'
                    : 'transparent',
                  borderLeft: isArmed
                    ? '3px solid #3b82f6'
                    : '3px solid transparent',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSeekToLine(idx)}
                  disabled={isEmpty}
                  title={
                    isEmpty
                      ? 'Empty / instrumental row'
                      : line.time !== null
                        ? `Seek to ${formatTime(line.time)} & arm this line`
                        : 'Seek near here & arm this line'
                  }
                  className="w-[78px] cursor-pointer rounded text-left tabular-nums text-white/50 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isEmpty
                    ? '—'
                    : line.time !== null
                      ? formatTime(line.time)
                      : isArmed
                        ? '→ ??'
                        : '  ??'}
                </button>
                <span
                  className="flex-1 truncate"
                  style={{
                    color: isEmpty
                      ? 'rgba(255,255,255,0.25)'
                      : isArmed
                        ? '#fff'
                        : isSynced
                          ? 'rgba(255,255,255,0.55)'
                          : 'rgba(255,255,255,0.4)',
                    fontStyle: isEmpty ? 'italic' : 'normal',
                  }}
                >
                  {isEmpty ? '(instrumental)' : line.text}
                </span>
              </li>
            )
          })}
        </ul>
        {cfg.lines.length === 0 && (
          <p className="py-6 text-center text-[11px] text-white/40">
            No lyrics to sync. Paste lyrics into the panel first.
          </p>
        )}
      </div>

      {/* Big TAP affordance */}
      <div className="border-t px-5 py-4"
           style={{ borderColor: '#1a1a1a' }}>
        <button
          type="button"
          onClick={handleTap}
          disabled={armed < 0 || !masterElement}
          className="flex w-full items-center justify-center gap-3 rounded-lg py-5 text-[14px] font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background:
              armed < 0
                ? '#1a1a1a'
                : 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
          }}
        >
          {armed < 0 ? 'All lines synced' : 'TAP NOW'}
          {armed >= 0 && (
            <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
              Spacebar
            </span>
          )}
        </button>
        <p className="mt-2 text-center text-[10px] text-white/40">
          Spacebar = TAP &nbsp;·&nbsp; Backspace = undo &nbsp;·&nbsp; R
          = rewind &nbsp;·&nbsp; Esc = close
        </p>
      </div>

      <div className="flex items-center justify-between border-t px-5 py-3"
           style={{ borderColor: '#1a1a1a' }}>
        <button
          type="button"
          onClick={handleUndo}
          disabled={historyRef.current.length === 0}
          className="flex items-center gap-1 rounded border bg-[#1a1a1a] px-2.5 py-1.5 text-[11px] text-white/70 hover:border-[#3b82f6] disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: '#2a2a2a' }}
        >
          <Undo2 className="h-3 w-3" />
          Undo
        </button>
        <button
          type="button"
          onClick={handleDiscardAll}
          disabled={syncedCount === 0}
          className="flex items-center gap-1 rounded border bg-[#1a1a1a] px-2.5 py-1.5 text-[11px] text-red-300/80 hover:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: '#2a2a2a' }}
        >
          <RotateCcw className="h-3 w-3" />
          Discard all
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-[#2a2a2a] px-3 py-1.5 text-[11px] text-white hover:bg-[#333]"
        >
          Done
        </button>
      </div>
    </ModalShell>
  )
}

/**
 * Horizontal scrubber. Shows duration as the bar width; the playhead
 * is positioned via percentage so it updates from the parent's rAF
 * polling cheaply (one inline-style write per frame, no DOM
 * restructuring). Markers are absolutely positioned at their
 * fraction-of-duration. Click anywhere on the bar fires the parent's
 * handler with the raw mouse event so the parent computes time and
 * does the seek + arm.
 */
function TimelineScrubber({
  nowSec,
  duration,
  lines,
  armedIdx,
  onClick,
}: {
  nowSec: number
  duration: number
  lines: LyricsLine[]
  armedIdx: number
  onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}): JSX.Element {
  const playheadPct =
    duration > 0 ? Math.max(0, Math.min(1, nowSec / duration)) * 100 : 0

  return (
    <div className="border-b px-5 py-3" style={{ borderColor: '#1a1a1a' }}>
      <div
        role="slider"
        aria-label="Song position — click to seek and arm nearest line"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, duration)}
        aria-valuenow={Math.max(0, nowSec)}
        tabIndex={duration > 0 ? 0 : -1}
        onClick={duration > 0 ? onClick : undefined}
        className="relative h-7 w-full cursor-pointer overflow-hidden rounded-md"
        style={{
          background: '#141414',
          border: '1px solid #2a2a2a',
          cursor: duration > 0 ? 'pointer' : 'not-allowed',
        }}
      >
        {/* Played-portion fill */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${playheadPct}%`,
            background:
              'linear-gradient(90deg, rgba(59,130,246,0.12), rgba(139,92,246,0.18))',
          }}
        />
        {/* Synced-line markers */}
        {duration > 0 &&
          lines.map((line, idx) => {
            if (line.time === null || line.text === '') return null
            const pct = Math.max(0, Math.min(1, line.time / duration)) * 100
            const isArmed = idx === armedIdx
            return (
              <span
                key={idx}
                aria-hidden="true"
                className="absolute top-0 bottom-0"
                style={{
                  left: `${pct}%`,
                  width: isArmed ? 3 : 2,
                  marginLeft: isArmed ? -1.5 : -1,
                  background: isArmed
                    ? '#3b82f6'
                    : 'rgba(255,255,255,0.55)',
                  boxShadow: isArmed
                    ? '0 0 6px rgba(59,130,246,0.6)'
                    : 'none',
                }}
              />
            )
          })}
        {/* Playhead */}
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0"
          style={{
            left: `${playheadPct}%`,
            width: 2,
            marginLeft: -1,
            background: '#ffffff',
            boxShadow: '0 0 6px rgba(255,255,255,0.7)',
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] tabular-nums text-white/30">
        <span>0:00</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}): JSX.Element {
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-[#0a0a0a] shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
        role="dialog"
        aria-modal="true"
        aria-label="Sync lyrics"
      >
        {children}
      </div>
    </>
  )
}

function findPrevSyncedTime(lines: LyricsLine[], idx: number): number | null {
  for (let i = idx - 1; i >= 0; i--) {
    if (lines[i].time !== null) return lines[i].time
  }
  return null
}

function findNextSyncedTime(lines: LyricsLine[], idx: number): number | null {
  for (let i = idx + 1; i < lines.length; i++) {
    if (lines[i].time !== null) return lines[i].time
  }
  return null
}

function formatTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00.00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t - m * 60)
  const ms = Math.floor((t - Math.floor(t)) * 100)
  return `${m}:${s.toString().padStart(2, '0')}.${ms
    .toString()
    .padStart(2, '0')}`
}
