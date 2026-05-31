import type {
  LyricsEntrance,
  LyricsLayerConfig,
  LyricsLine,
} from '@/types/layer'
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

/**
 * Apply the per-line entrance animation to a draw plan. The progress
 * value (0 → 1 over the cross-fade window) drives all variants —
 * always identical for the same currentTime, so preview and export
 * agree byte-for-byte.
 *
 * Returns a modified draw set; for 'blur', also a wrapper that the
 * caller invokes around the actual drawStyledText call so the
 * ctx.filter blur applies both to the offscreen glow composite and
 * the sharp pass.
 */
interface EntrancePlan {
  /** y offset to add (negative or positive). */
  dy: number
  /** Multiplier on the line's fontSize. */
  sizeMul: number
  /** Multiplier on the opacityMul (already from cross-fade). */
  opacityMul: number
  /** When > 0, ctx.filter = blur(Npx) wraps the draw call. */
  blurPx: number
}

function planEntrance(
  variant: LyricsEntrance,
  progress: number,
  fontSize: number,
): EntrancePlan {
  const p = clamp01(progress)
  const plan: EntrancePlan = {
    dy: 0,
    sizeMul: 1,
    opacityMul: 1,
    blurPx: 0,
  }
  switch (variant) {
    case 'none':
    case 'fade':
      // 'fade' is visually identical to 'none' at the same fadeSec —
      // the cross-fade already does a fade-in. Listed as a separate
      // option so the panel UI can say "Fade in" explicitly without
      // surprising users who expect a dedicated effect to do *something*.
      return plan
    case 'slide-up':
      // Line begins ~0.5×fontSize below the anchor and rises into
      // place. The (1 - p) easing is linear — good enough for a
      // 200 ms window; cubic-ease wouldn't be visibly different.
      plan.dy = (1 - p) * fontSize * 0.5
      return plan
    case 'scale':
      plan.sizeMul = 0.85 + 0.15 * p
      return plan
    case 'blur':
      // Cap at 8 px so the line is still vaguely legible at progress
      // 0; the eye reads "coming into focus" cleanly between 4 and 8.
      plan.blurPx = (1 - p) * 6
      return plan
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
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

  // Entrance animation for the ACTIVE line only — context lines stay
  // at their fixed dim look (extending the entrance to them would
  // make the whole frame "swim" on every line change).
  const entrance = planEntrance(
    config.entrance ?? 'none',
    activeFade,
    config.fontSize,
  )
  const drawActive = (): void => {
    drawStyledText(
      ctx,
      {
        ...base,
        text: active.text,
        x: anchorX,
        y: anchorY + entrance.dy,
        fontSize: config.fontSize * entrance.sizeMul,
        opacityMul: activeFade * entrance.opacityMul,
      },
      width,
      height,
      bassEnergy,
    )
  }
  if (entrance.blurPx > 0) {
    // ctx.filter on main BEFORE drawStyledText: applies to subsequent
    // strokes/fills on this context AND to drawGlow's composited
    // drawImage (drawGlow does mainCtx.save/drawImage/restore, so the
    // filter inherited from our save here covers the composite call).
    ctx.save()
    ctx.filter = `blur(${entrance.blurPx}px)`
    drawActive()
    ctx.restore()
  } else {
    drawActive()
  }
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

    if (offset === 0) {
      // ENTRANCE for the active line only. Other scroll items keep
      // their static look so the surrounding stack is a stable frame
      // of reference for the entrance motion.
      const entrance = planEntrance(
        config.entrance ?? 'none',
        activeFade,
        config.fontSize,
      )
      const drawActive = (): void => {
        drawStyledText(
          ctx,
          {
            ...base,
            audioReactiveEnabled: base.audioReactiveEnabled,
            text: line.text,
            x: anchorX,
            y: y + entrance.dy,
            fontSize: config.fontSize * sizeMul * entrance.sizeMul,
            opacityMul: opacity * entrance.opacityMul,
          },
          width,
          height,
          bassEnergy,
        )
      }
      if (entrance.blurPx > 0) {
        ctx.save()
        ctx.filter = `blur(${entrance.blurPx}px)`
        drawActive()
        ctx.restore()
      } else {
        drawActive()
      }
    } else {
      drawStyledText(
        ctx,
        {
          ...base,
          audioReactiveEnabled: false,
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
}
