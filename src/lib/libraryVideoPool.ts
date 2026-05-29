/**
 * Module-level pool of HTMLVideoElement instances for LIBRARY
 * (Supabase-hosted) videos. Keyed by the video's stable public URL.
 *
 * Each pool entry holds TWO video elements that share the same src
 * and alternate as the active player, with a brief crossfade between
 * them at every loop boundary. The standby element pre-rolls to 0
 * before becoming visible, and the outgoing element only seeks
 * back to 0 AFTER it's faded out — so no visible seek-flash, no
 * decoder reprime under the user's gaze. Industry-standard approach
 * (Vizzy, Specterr) for truly seamless looping background video.
 *
 * This replaces the previous single-element + seek-before-end fix
 * (applySeekBeforeEnd) which still produced a flash because the
 * code-triggered seek itself caused a decoder reseek visible as a
 * dark frame. Two-element crossfade structurally eliminates the
 * flash — no element ever seeks while it's being drawn.
 *
 * Distinct from the user-upload videoPool, which keeps its own
 * lifecycle / trim / sync logic untouched.
 *
 * Library videos are decoration — never the audio source, always
 * muted, full-canvas cover-fit, looped seamlessly.
 */

/**
 * Crossfade window in seconds. ~350 ms is long enough to mask the
 * pre-roll latency of the standby element (browsers can take a
 * few hundred ms to start decoding from a play() call on a paused
 * element) while staying short enough that even a loop with
 * subtle content discontinuity reads as continuous motion. Below
 * 200 ms the crossfade starts to feel like a jump cut; above 500 ms
 * it becomes a perceivable fade on alert viewers.
 */
const CROSSFADE_SEC = 0.35

/**
 * Minimum elapsed time on the active element before we allow a
 * crossfade to start. Stops a very-short-clip edge case (duration
 * < 2*CROSSFADE_SEC) from triggering a crossfade on the first
 * frame. Belt-and-braces — library content is curated 10 s+ loops
 * in practice.
 */
const MIN_ACTIVE_TIME_BEFORE_CROSSFADE_SEC = CROSSFADE_SEC * 2

export interface LibraryEntry {
  elementA: HTMLVideoElement
  elementB: HTMLVideoElement
  /** Which element the renderer is currently using as the primary. */
  active: 'A' | 'B'
  /** True while a crossfade is in progress; reset to false on swap. */
  crossfading: boolean
  /** 0..1 progress through the active crossfade. 0 when not crossfading. */
  crossfadeT: number
  /** Cached duration in seconds. 0 until metadata loads. */
  duration: number
}

const pool = new Map<string, LibraryEntry>()

function configureElement(url: string): HTMLVideoElement {
  const v = document.createElement('video')
  v.src = url
  v.muted = true
  v.playsInline = true
  // Loop is deliberately FALSE — we manage looping ourselves via
  // crossfade. Leaving loop=true here would let the browser race
  // us into the loop boundary and re-introduce the flash.
  v.loop = false
  // crossOrigin is required so canvas.drawImage(video) doesn't taint
  // the canvas (which would block captureStream() / toBlob() for
  // export). Supabase Storage public buckets serve the right CORS
  // headers; if a custom CDN ever fronts these URLs, it MUST set
  // Access-Control-Allow-Origin or exports break silently.
  v.crossOrigin = 'anonymous'
  v.preload = 'auto'
  v.load()
  return v
}

/**
 * Get the pooled two-element entry for `url`, creating it on first
 * request. Safe to call from a render loop; idempotent after first
 * call. Each frame, the caller MUST also call updateLibraryEntry to
 * advance the crossfade state machine before drawing.
 */
export function getOrLoadLibraryEntry(url: string): LibraryEntry {
  const existing = pool.get(url)
  if (existing) return existing

  const elementA = configureElement(url)
  const elementB = configureElement(url)
  const entry: LibraryEntry = {
    elementA,
    elementB,
    active: 'A',
    crossfading: false,
    crossfadeT: 0,
    duration: 0,
  }

  // Kick A into playback. play() can reject under autoplay policy
  // for unmuted contexts; the elements are muted so this is almost
  // always allowed, and we swallow the rejection because the
  // background isn't critical to user interaction.
  void elementA.play().catch(() => {})

  pool.set(url, entry)
  return entry
}

/**
 * Advance the crossfade state machine for one entry. Called once per
 * frame per background-video layer from the renderer. Cheap — a few
 * numeric reads + a comparison; the actual asset draw still happens
 * in the renderer.
 *
 * State transitions:
 *   1. duration not yet known → seed from active.duration when it
 *      becomes finite. Skip the rest until we have a duration.
 *   2. tBeforeEnd > CROSSFADE_SEC → idle; nothing to do.
 *   3. tBeforeEnd <= CROSSFADE_SEC + not crossfading → start crossfade:
 *      reset standby to 0, play it, mark crossfading.
 *   4. crossfading → advance crossfadeT proportional to remaining time.
 *   5. crossfadeT >= 1 → finish swap: pause + seek-to-0 the OLD active
 *      (now hidden — the seek is invisible), flip which letter is
 *      active, reset crossfade state.
 *
 * The MIN_ACTIVE_TIME_BEFORE_CROSSFADE_SEC guard prevents a runaway
 * loop on very-short clips and on the just-loaded state where the
 * active element's currentTime is still ≈ 0.
 */
export function updateLibraryEntry(entry: LibraryEntry): void {
  const active =
    entry.active === 'A' ? entry.elementA : entry.elementB
  const standby =
    entry.active === 'A' ? entry.elementB : entry.elementA

  // Seed duration when metadata becomes available.
  if (entry.duration <= 0) {
    const d = active.duration
    if (isFinite(d) && d > 0) entry.duration = d
    else return
  }

  const tBeforeEnd = entry.duration - active.currentTime

  if (!entry.crossfading) {
    if (
      tBeforeEnd <= CROSSFADE_SEC &&
      active.currentTime > MIN_ACTIVE_TIME_BEFORE_CROSSFADE_SEC
    ) {
      // Pre-roll standby from 0 and start playing it. It needs a
      // few ms head-start to have a decoded first frame ready;
      // CROSSFADE_SEC = 0.35 s comfortably accommodates this on
      // modern hardware. If the browser's still spinning up the
      // decode by mid-crossfade, the alpha-blend masks it.
      try {
        standby.currentTime = 0
      } catch {
        /* not yet seekable — play() will start from wherever it lands */
      }
      void standby.play().catch(() => {})
      entry.crossfading = true
      entry.crossfadeT = 0
    }
    return
  }

  // Crossfading: drive crossfadeT off the active element's remaining
  // time. tBeforeEnd 0 → t = 1, tBeforeEnd CROSSFADE_SEC → t = 0.
  const t = 1 - Math.max(0, tBeforeEnd) / CROSSFADE_SEC
  entry.crossfadeT = Math.max(0, Math.min(1, t))

  if (entry.crossfadeT >= 1) {
    // Crossfade complete — swap. The OLD active is no longer being
    // drawn (renderer reads entry.active) so we can pause + seek
    // it freely; the seek is invisible.
    try {
      active.pause()
    } catch {
      /* ignore */
    }
    try {
      active.currentTime = 0
    } catch {
      /* ignore */
    }
    entry.active = entry.active === 'A' ? 'B' : 'A'
    entry.crossfading = false
    entry.crossfadeT = 0
  }
}

/**
 * Tear down a pool entry. The current background renderer doesn't
 * call this — library URLs are stable and we KEEP entries live
 * because switching backgrounds usually means switching between a
 * handful of choices. Exposed for completeness / future cleanup
 * pressure (e.g. a "clear unused library entries" pass).
 */
export function releaseLibraryEntry(url: string): void {
  const entry = pool.get(url)
  if (!entry) return
  for (const v of [entry.elementA, entry.elementB]) {
    try {
      v.pause()
      v.removeAttribute('src')
      v.load()
    } catch {
      /* ignore — already torn down */
    }
  }
  pool.delete(url)
}

/** Snapshot for diagnostics. Each entry is 2 video elements. */
export function getLibraryPoolSize(): number {
  return pool.size
}
