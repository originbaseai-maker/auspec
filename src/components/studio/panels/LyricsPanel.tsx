import { useMemo, useState } from 'react'
import { Mic2, RotateCcw } from 'lucide-react'
import { useAudioStore } from '@/store/useAudioStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useMasterClock } from '@/lib/masterClock'
import {
  FONT_CATEGORIES,
  type FontFamily,
  type LyricsLayerConfig,
  type LyricsLine,
} from '@/types/layer'
import { ensureFontLoaded } from '@/lib/fontLoader'
import { LyricsSyncModal } from '../LyricsSyncModal'
import {
  ColorRow,
  LockedLayerBanner,
  PanelGroup,
  SegmentedGroup,
  SliderRow,
  Toggle,
} from './shared'

interface Props {
  layerId: string
}

/**
 * Convert pasted lyrics text into a list of timed lines, preserving
 * already-synced timestamps for lines whose text hasn't changed.
 * Index-aligned matching: if line N's text is unchanged we keep its
 * old `time`; otherwise it resets to null. Empty rows are kept as
 * instrumental gaps and trailing blanks are trimmed so a user
 * hitting Enter at the end doesn't accumulate stray rows.
 */
function parsePaste(raw: string, existing: LyricsLine[]): LyricsLine[] {
  const rows = raw.split(/\r?\n/)
  const out: LyricsLine[] = []
  for (let i = 0; i < rows.length; i++) {
    const text = rows[i].trim()
    const prev = existing[i]
    const time = prev && prev.text === text ? prev.time : null
    out.push({ text, time })
  }
  while (out.length > 0 && out[out.length - 1].text === '') {
    out.pop()
  }
  return out
}

function linesToText(lines: LyricsLine[]): string {
  return lines.map((l) => l.text).join('\n')
}

function formatTime(t: number | null): string {
  if (t === null) return '--:--'
  const m = Math.floor(t / 60)
  const s = Math.floor(t - m * 60)
  const ms = Math.floor((t - Math.floor(t)) * 100)
  return `${m}:${s.toString().padStart(2, '0')}.${ms
    .toString()
    .padStart(2, '0')}`
}

export function LyricsPanel({ layerId }: Props) {
  // Same draft-aware lookup as TextPanel — newly-drafted Lyrics
  // layers live on s.draftLayer until commit, so we must check it
  // explicitly or the panel pops "Layer not found" on first open.
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
  const updateConfig = useLayerStore((s) => s.updateConfig)
  const setCurrentTime = useAudioStore((s) => s.setCurrentTime)
  const masterClock = useMasterClock()
  const masterElement = masterClock.element
  const [syncOpen, setSyncOpen] = useState(false)

  if (!layer) {
    return (
      <div className="p-4 text-center text-[11px] text-white/50">
        Layer not found. Select a layer in the Layers sidebar.
      </div>
    )
  }

  const cfg = layer.config as LyricsLayerConfig
  const isLocked = layer.locked
  const update = (partial: Partial<LyricsLayerConfig>) =>
    updateConfig(layerId, partial)

  const pasteText = useMemo(() => linesToText(cfg.lines), [cfg.lines])
  const syncedCount = cfg.lines.filter((l) => l.time !== null).length
  const totalCount = cfg.lines.length

  const onPasteChange = (raw: string) => {
    update({ lines: parsePaste(raw, cfg.lines) })
  }

  const jumpTo = (t: number): void => {
    if (masterElement) {
      try {
        masterElement.currentTime = t
      } catch {
        /* not seekable yet */
      }
    }
    setCurrentTime(t)
  }

  const nudgeLine = (idx: number, delta: number): void => {
    const lines = [...cfg.lines]
    const cur = lines[idx]
    if (cur.time === null) return
    lines[idx] = { ...cur, time: Math.max(0, cur.time + delta) }
    update({ lines })
  }

  const clearLineTime = (idx: number): void => {
    const lines = [...cfg.lines]
    lines[idx] = { ...lines[idx], time: null }
    update({ lines })
  }

  return (
    <div
      className="space-y-4"
      style={{
        opacity: isLocked ? 0.5 : 1,
        pointerEvents: isLocked ? 'none' : 'auto',
      }}
    >
      {isLocked && <LockedLayerBanner />}

      <PanelGroup title="Lyrics">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Paste — one line per row
        </p>
        <textarea
          value={pasteText}
          onChange={(e) => onPasteChange(e.target.value)}
          placeholder={`Hello, darkness, my old friend\nI've come to talk with you again\n...`}
          rows={8}
          className="w-full rounded border bg-[#0f0f0f] px-2 py-1.5 text-[12px] text-white outline-none focus:border-[#3b82f6] resize-y"
          style={{ borderColor: '#2a2a2a', fontFamily: 'monospace' }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-white/40">
            {syncedCount}/{totalCount} lines synced
          </span>
          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            disabled={totalCount === 0}
            className="flex items-center gap-1.5 rounded-md border bg-[#1a1a1a] px-2.5 py-1 text-[11px] text-white hover:border-[#3b82f6] disabled:cursor-not-allowed disabled:opacity-30"
            style={{ borderColor: '#3b82f6' }}
          >
            <Mic2 className="h-3 w-3" aria-hidden="true" />
            {syncedCount === 0 ? 'Sync lyrics' : 'Re-sync'}
          </button>
        </div>
      </PanelGroup>

      {syncedCount > 0 && (
        <PanelGroup title="Fine-tune">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/40">
            ▶ preview · ± nudge 0.1 s · ⟲ un-sync
          </p>
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {cfg.lines.map((line, idx) => {
              // Trim trailing blanks at the visual level — a row that
              // has neither text nor a timestamp is just noise.
              if (line.text === '' && line.time === null) return null
              return (
                <li
                  key={idx}
                  className="flex items-center gap-2 rounded border bg-[#0a0a0a] px-2 py-1 text-[11px]"
                  style={{ borderColor: '#2a2a2a' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (line.time !== null) jumpTo(line.time)
                    }}
                    disabled={line.time === null}
                    className="rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] text-white/70 hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-30"
                    title="Preview from here"
                  >
                    ▶
                  </button>
                  <span className="w-[72px] tabular-nums text-white/60">
                    {formatTime(line.time)}
                  </span>
                  <span className="flex-1 truncate text-white/85">
                    {line.text || (
                      <em className="text-white/30">(instrumental)</em>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => nudgeLine(idx, -0.1)}
                    disabled={line.time === null}
                    className="rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] text-white/60 hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-30"
                    title="−0.1 s"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => nudgeLine(idx, 0.1)}
                    disabled={line.time === null}
                    className="rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] text-white/60 hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-30"
                    title="+0.1 s"
                  >
                    +
                  </button>
                  {line.time !== null && (
                    <button
                      type="button"
                      onClick={() => clearLineTime(idx)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-white/40 hover:text-red-400"
                      title="Un-sync this line"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </PanelGroup>
      )}

      <PanelGroup title="Display Mode">
        <SegmentedGroup
          cols={2}
          value={cfg.displayMode}
          onChange={(v) => update({ displayMode: v as LyricsLayerConfig['displayMode'] })}
          options={[
            { id: 'spotlight', label: 'Spotlight', sub: 'one line bright' },
            { id: 'scroll', label: 'Scroll', sub: 'teleprompter' },
          ]}
        />
        {cfg.displayMode === 'spotlight' && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-white/70">Show prev + next</span>
            <Toggle
              checked={cfg.spotlightContext !== false}
              onChange={(v) => update({ spotlightContext: v })}
              ariaLabel="Spotlight context"
            />
          </div>
        )}
        {cfg.displayMode === 'scroll' && (
          <div className="mt-3">
            <SliderRow
              label="Visible lines"
              hint={`±${cfg.scrollVisibleLines ?? 2}`}
              value={cfg.scrollVisibleLines ?? 2}
              min={0}
              max={4}
              step={1}
              onChange={(v) => update({ scrollVisibleLines: Math.round(v) })}
              ariaLabel="Scroll visible lines"
            />
          </div>
        )}
        <div className="mt-3">
          <SliderRow
            label="Cross-fade"
            hint={`${(cfg.fadeSec ?? 0.2).toFixed(2)}s`}
            value={cfg.fadeSec ?? 0.2}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update({ fadeSec: v })}
            ariaLabel="Line cross-fade"
          />
        </div>
      </PanelGroup>

      <PanelGroup title="Font">
        <div className="space-y-2">
          {FONT_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="mb-1 text-[9px] uppercase tracking-wider text-white/30">
                {cat.label}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {cat.fonts.map((font) => {
                  const active = cfg.font === font
                  return (
                    <button
                      key={font}
                      type="button"
                      onClick={() => {
                        void ensureFontLoaded(font as FontFamily)
                        update({ font })
                      }}
                      className="rounded border px-2 py-1.5 text-[11px] transition-colors"
                      style={{
                        borderColor: active ? '#3b82f6' : '#2a2a2a',
                        background: active
                          ? 'rgba(59,130,246,0.15)'
                          : '#1a1a1a',
                        color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                        fontFamily: `"${font}", sans-serif`,
                      }}
                    >
                      {font}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </PanelGroup>

      <SliderRow
        label="Size"
        hint={`${cfg.fontSize}px`}
        value={cfg.fontSize}
        min={12}
        max={120}
        step={1}
        onChange={(v) => update({ fontSize: Math.round(v) })}
        ariaLabel="Font size"
      />

      <PanelGroup title="Color">
        <ColorRow
          value={cfg.color}
          onChange={(c) => update({ color: c })}
          ariaLabel="text color"
        />
      </PanelGroup>

      <PanelGroup title="Shadow">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Drop shadow</span>
          <Toggle
            checked={cfg.shadowEnabled}
            onChange={(v) => update({ shadowEnabled: v })}
            ariaLabel="Shadow"
          />
        </div>
        <div
          style={{ opacity: cfg.shadowEnabled ? 1 : 0.4 }}
          className="space-y-2"
        >
          <SliderRow
            label="Intensity"
            hint={`${Math.round(cfg.shadowIntensity)}%`}
            value={cfg.shadowIntensity}
            min={0}
            max={100}
            step={1}
            onChange={(v) => update({ shadowIntensity: v })}
            ariaLabel="Shadow intensity"
          />
          <div>
            <p className="mb-1 text-[11px] text-white/70">Color</p>
            <ColorRow
              value={cfg.shadowColor}
              onChange={(c) => update({ shadowColor: c })}
              ariaLabel="shadow color"
            />
          </div>
        </div>
      </PanelGroup>

      <PanelGroup title="Glow">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Outer glow</span>
          <Toggle
            checked={cfg.glowEnabled === true}
            onChange={(v) => update({ glowEnabled: v })}
            ariaLabel="Glow"
          />
        </div>
        <div
          style={{ opacity: cfg.glowEnabled ? 1 : 0.4 }}
          className="space-y-2"
        >
          <SliderRow
            label="Intensity"
            hint={`${Math.round(cfg.glowIntensity ?? 24)}px`}
            value={cfg.glowIntensity ?? 24}
            min={0}
            max={60}
            step={1}
            onChange={(v) => update({ glowIntensity: Math.round(v) })}
            ariaLabel="Glow intensity"
          />
          <div>
            <p className="mb-1 text-[11px] text-white/70">Color</p>
            <ColorRow
              value={cfg.glowColor ?? cfg.color}
              onChange={(c) => update({ glowColor: c })}
              ariaLabel="glow color"
            />
          </div>
        </div>
      </PanelGroup>

      <PanelGroup title="Outline">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Stroke</span>
          <Toggle
            checked={cfg.outlineEnabled === true}
            onChange={(v) => update({ outlineEnabled: v })}
            ariaLabel="Outline"
          />
        </div>
        <div
          style={{ opacity: cfg.outlineEnabled ? 1 : 0.4 }}
          className="space-y-2"
        >
          <SliderRow
            label="Width"
            hint={`${cfg.outlineWidth ?? 2}px`}
            value={cfg.outlineWidth ?? 2}
            min={0}
            max={20}
            step={0.5}
            onChange={(v) => update({ outlineWidth: v })}
            ariaLabel="Outline width"
          />
          <div>
            <p className="mb-1 text-[11px] text-white/70">Color</p>
            <ColorRow
              value={cfg.outlineColor ?? '#000000'}
              onChange={(c) => update({ outlineColor: c })}
              ariaLabel="outline color"
            />
          </div>
        </div>
      </PanelGroup>

      <PanelGroup title="Gradient Fill">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Two-stop gradient</span>
          <Toggle
            checked={cfg.gradientEnabled === true}
            onChange={(v) => update({ gradientEnabled: v })}
            ariaLabel="Gradient"
          />
        </div>
        <div
          style={{ opacity: cfg.gradientEnabled ? 1 : 0.4 }}
          className="space-y-2"
        >
          <div>
            <p className="mb-1 text-[11px] text-white/70">
              Stop 2 (Color above is stop 1)
            </p>
            <ColorRow
              value={cfg.gradientColor2 ?? '#3b82f6'}
              onChange={(c) => update({ gradientColor2: c })}
              ariaLabel="gradient stop 2 color"
            />
          </div>
          <SliderRow
            label="Angle"
            hint={`${Math.round(cfg.gradientAngle ?? 90)}°`}
            value={cfg.gradientAngle ?? 90}
            min={0}
            max={360}
            step={1}
            onChange={(v) => update({ gradientAngle: Math.round(v) })}
            ariaLabel="Gradient angle"
          />
        </div>
      </PanelGroup>

      <PanelGroup title="Audio Reactive">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-white/70">Pulse with bass</span>
          <Toggle
            checked={cfg.audioReactiveEnabled === true}
            onChange={(v) => update({ audioReactiveEnabled: v })}
            ariaLabel="Audio reactive"
          />
        </div>
        <div
          style={{ opacity: cfg.audioReactiveEnabled ? 1 : 0.4 }}
          className="space-y-2"
        >
          <SliderRow
            label="Intensity"
            hint={`${Math.round((cfg.audioReactiveIntensity ?? 0.4) * 100)}%`}
            value={cfg.audioReactiveIntensity ?? 0.4}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update({ audioReactiveIntensity: v })}
            ariaLabel="Audio reactive intensity"
          />
        </div>
      </PanelGroup>

      {syncOpen && (
        <LyricsSyncModal layerId={layerId} onClose={() => setSyncOpen(false)} />
      )}
    </div>
  )
}

export default LyricsPanel
