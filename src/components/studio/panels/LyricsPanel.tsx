import { useMemo } from 'react'
import { useLayerStore } from '@/store/useLayerStore'
import {
  FONT_CATEGORIES,
  type FontFamily,
  type LyricsLayerConfig,
  type LyricsLine,
} from '@/types/layer'
import { ensureFontLoaded } from '@/lib/fontLoader'
import {
  ColorRow,
  LockedLayerBanner,
  PanelGroup,
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
        <p className="mt-2 text-[10px] text-white/40">
          {syncedCount}/{totalCount} lines synced — Sync mode coming in
          the next step.
        </p>
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
    </div>
  )
}

export default LyricsPanel
