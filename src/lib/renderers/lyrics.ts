import type { LyricsLayerConfig, LyricsLine } from '@/types/layer'
import { drawStyledText, type StyledTextOpts } from './textOverlay'

/**
 * Karaoke renderer. Picks the "active" line by binary-searching the
 * sorted-by-time line list against the master-clock currentTime, then
 * draws it (and contextual neighbours, depending on display mode)
 * through the SHARED drawStyledText helper — so every Lyrics layer
 * inherits font loading, glow-via-drawGlow, outline, gradient, and
 * audio-reactive pulse identical to Text layers.
 *
 * Display modes:
 *   - 'spotlight': active line at the layer's anchor, optionally
 *     previous + next at reduced size + opacity above/below. Classic
 *     music-video subtitle look.
 *   - 'scroll': stack of N lines centred on the active one; older
 *     lines slide up and fade out, newer lines wait below. Karaoke-
 *     prompter style.
 *
 * Unsynced lines (time === null) are skipped entirely — they don't
 * exist on the timeline yet and the renderer must not invent a
 * position for them.
 */
export function drawLyricsLayer(
  ctx: CanvasRenderingContext2D,
  config: LyricsLayerConfig,
  width: number,
  height: number,
  currentTime: number,
  bassEnergy: number,
): void {
  const synced = synchedLines(config.lines)
  if (synced.length === 0) return

  const activeIdx = findActiveIndex(synced, currentTime)
  if (activeIdx < 0) {
    // Before the very first cue — don't paint anything. Avoids the
    // "first line lingers from t=0" feel.
    return
  }

  if (config.displayMode === 'spotlight') {
    drawSpotlight(ctx, config, synced, activeIdx, currentTime, width, height, bassEnergy)
  } else {
    drawScroll(ctx, config, synced, activeIdx, currentTime, width, height, bassEnergy)
  }
}

/** Index into `lines` array. Reused for cross-fade timing. */
interface SyncedLine {
  /** Index in the original config.lines list (for stable identity). */
  origIndex: number
  /** Always finite after filtering. */
  time: number
  text: string
}

function synchedLines(lines: LyricsLine[]): SyncedLine[] {
  const out: SyncedLine[] = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.time !== null && Number.isFinite(l.time)) {
      out.push({ origIndex: i, time: l.time, text: l.text })
    }
  }
  // Stable sort by time so out-of-order user fine-tuning still
  // renders in playback order. Equal times → preserve insertion order.
  out.sort((a, b) => a.time - b.time || a.origIndex - b.origIndex)
  return out
}

/**
 * Last index with time <= currentTime. -1 when currentTime precedes
 * every cue. Linear scan is fine — typical songs have 30–60 lines.
 */
function findActiveIndex(synced: SyncedLine[], t: number): number {
  for (let i = synced.length - 1; i >= 0; i--) {
    if (synced[i].time <= t) return i
  }
  return -1
}

/**
 * Cross-fade alpha: 1 once the line has been "on" for >= fadeSec;
 * ramps from 0 → 1 over the fadeSec window after its time. The
 * outgoing line, by symmetry, can be drawn at (1 - newLineAlpha) so
 * neighbouring lines hand off smoothly during the fade.
 */
function fadeInAlpha(line: SyncedLine, now: number, fadeSec: number): number {
  if (fadeSec <= 0) return 1
  const dt = now - line.time
  if (dt >= fadeSec) return 1
  if (dt <= 0) return 0
  return dt / fadeSec
}

function commonOpts(config: LyricsLayerConfig): Omit<StyledTextOpts, 'text' | 'x' | 'y' | 'fontSize' | 'opacityMul'> {
  return {
    font: config.font,
    fontWeight: config.fontWeight,
    color: config.color,
    letterSpacing: config.letterSpacing,
    shadowEnabled: config.shadowEnabled,
    shadowIntensity: config.shadowIntensity,
    shadowColor: config.shadowColor,
    glowEnabled: config.glowEnabled,
    glowIntensity: config.glowIntensity,
    glowColor: config.glowColor,
    outlineEnabled: config.outlineEnabled,
    outlineColor: config.outlineColor,
    outlineWidth: config.outlineWidth,
    gradientEnabled: config.gradientEnabled,
    gradientColor2: config.gradientColor2,
    gradientAngle: config.gradientAngle,
    audioReactiveEnabled: config.audioReactiveEnabled,
    audioReactiveIntensity: config.audioReactiveIntensity,
    textAlign: 'center',
  }
}

function drawSpotlight(
  ctx: CanvasRenderingContext2D,
  config: LyricsLayerConfig,
  synced: SyncedLine[],
  activeIdx: number,
  currentTime: number,
  width: number,
  height: number,
  bassEnergy: number,
): void {
  const anchorX = config.x * width
  const anchorY = config.y * height
  const fadeSec = Math.max(0, config.fadeSec ?? 0.2)
  const showContext = config.spotlightContext !== false
  const base = commonOpts(config)

  const active = synced[activeIdx]
  const activeFade = fadeInAlpha(active, currentTime, fadeSec)

  // Context lines render BEFORE the active one so the active line's
  // glow + sharp passes always paint on top, never under a dimmed
  // ghost. Audio-reactive pulse is intentionally restricted to the
  // active line (passing audioReactiveEnabled:false through for
  // context) — a row of pulsing dim ghosts dilutes the focus.
  if (showContext) {
    const dimSize = config.fontSize * 0.55
    const lineGap = config.fontSize * 1.4
    const dimOpacity = 0.35
    const prev = synced[activeIdx - 1]
    const next = synced[activeIdx + 1]

    if (prev) {
      drawStyledText(
        ctx,
        {
          ...base,
          audioReactiveEnabled: false,
          text: prev.text,
          x: anchorX,
          y: anchorY - lineGap,
          fontSize: dimSize,
          opacityMul: dimOpacity * (1 - activeFade * 0.5),
        },
        width,
        height,
        bassEnergy,
      )
    }
    if (next) {
      drawStyledText(
        ctx,
        {
          ...base,
          audioReactiveEnabled: false,
          text: next.text,
          x: anchorX,
          y: anchorY + lineGap,
          fontSize: dimSize,
          opacityMul: dimOpacity,
        },
        width,
        height,
        bassEnergy,
      )
    }
  }

  drawStyledText(
    ctx,
    {
      ...base,
      text: active.text,
      x: anchorX,
      y: anchorY,
      fontSize: config.fontSize,
      opacityMul: activeFade,
    },
    width,
    height,
    bassEnergy,
  )
}

function drawScroll(
  ctx: CanvasRenderingContext2D,
  config: LyricsLayerConfig,
  synced: SyncedLine[],
  activeIdx: number,
  currentTime: number,
  width: number,
  height: number,
  bassEnergy: number,
): void {
  const anchorX = config.x * width
  const anchorY = config.y * height
  const visible = Math.max(0, config.scrollVisibleLines ?? 2)
  const fadeSec = Math.max(0, config.fadeSec ?? 0.2)
  const base = commonOpts(config)

  const lineGap = config.fontSize * 1.3
  const active = synced[activeIdx]
  const activeFade = fadeInAlpha(active, currentTime, fadeSec)

  // Smooth scroll: shift the whole stack by the cross-fade progress
  // so the active line slides INTO its anchor position over the
  // fadeSec window. Reads as a gentle teleprompter scroll rather
  // than a hard step at each cue.
  const scrollShift = lineGap * (1 - activeFade)

  // Render from oldest visible to newest so the active line's
  // sharp pass sits on top of any neighbour shadows / glows.
  const start = Math.max(0, activeIdx - visible)
  const end = Math.min(synced.length - 1, activeIdx + visible)

  for (let i = start; i <= end; i++) {
    const line = synced[i]
    const offset = i - activeIdx
    const y = anchorY + offset * lineGap + scrollShift

    // Distance-based opacity. Active line full; adjacent lines fade
    // linearly to 0 over `visible` steps. Past lines get a slightly
    // steeper falloff than future lines (already-sung text reads
    // as background context).
    const distance = Math.abs(offset)
    let opacity: number
    if (offset === 0) {
      opacity = activeFade
    } else if (offset < 0) {
      opacity = Math.max(0, 0.45 - distance * 0.2)
    } else {
      opacity = Math.max(0, 0.6 - distance * 0.25)
    }
    if (opacity <= 0.02) continue

    const sizeMul = offset === 0 ? 1 : 0.7
    drawStyledText(
      ctx,
      {
        ...base,
        audioReactiveEnabled: offset === 0 ? base.audioReactiveEnabled : false,
        text: line.text,
        x: anchorX,
        y,
        fontSize: config.fontSize * sizeMul,
        opacityMul: opacity,
      },
      width,
      height,
      bassEnergy,
    )
  }
}
