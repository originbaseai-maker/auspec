/**
 * Module-level pool of HTMLVideoElement instances for LIBRARY
 * (Supabase-hosted) videos. Keyed by the video's stable public URL.
 *
 * This is intentionally separate from the user-upload videoPool:
 *   - userVideoPool entries are owned by useVideoAssetStore + lifecycle
 *     managed by VisualizerCanvas (create on add, destroy on remove).
 *   - libraryVideoPool entries are self-managing — the first frame
 *     that needs a given URL lazily creates the element, autoplays it
 *     (muted + looping), and caches it for every subsequent frame.
 *     Library elements are never explicitly torn down because the URL
 *     is stable; if the user picks a different library video the old
 *     element stays in the pool ready for re-use if they switch back.
 *
 * Library videos are decoration — never the audio source, always
 * muted, full-canvas cover-fit, looped seamlessly.
 */

const pool = new Map<string, HTMLVideoElement>()

/**
 * Seconds before the natural end at which we proactively rewind to
 * 0. Bridges roughly 2–3 frames at 30 fps — enough to pre-empt the
 * browser's decoder reprime when 'ended' would otherwise fire (the
 * cause of the brief black flash on loop boundaries), small enough
 * that the user can't perceive the early rewind. The video element
 * still has `loop = true` set as a defence in case the rAF-driven
 * render check ever misses a window.
 */
const LOOP_HEAD_SEC = 0.08

/**
 * Idempotent seamless-loop check. Called every frame from
 * getOrLoadLibraryVideo so it runs at the render loop's natural
 * frequency on whatever library URLs are currently in use. Cost
 * per call: two number reads + a comparison.
 *
 * Bails on Infinity (streaming videos / not-yet-loaded duration)
 * and on a still-loading element (duration === 0). Wraps the
 * currentTime write in try/catch because some browsers throw
 * NotAllowedError if the element isn't seekable yet.
 */
function applySeekBeforeEnd(v: HTMLVideoElement): void {
  const d = v.duration
  if (!isFinite(d) || d <= 0) return
  if (v.currentTime < d - LOOP_HEAD_SEC) return
  try {
    v.currentTime = 0
  } catch {
    /* element not yet seekable — the loop=true fallback will catch it */
  }
}

/**
 * Get the pooled video element for `url`, creating + starting playback
 * on first request. Safe to call from a render loop; idempotent after
 * first call. The per-frame call site also drives the seek-before-end
 * loop-seamlessness check on the returned element.
 */
export function getOrLoadLibraryVideo(url: string): HTMLVideoElement {
  let v = pool.get(url)
  if (v) {
    // Cheap seek-before-end check every frame the renderer asks for
    // this URL — preempts the decoder reprime that produces the
    // black flash. If the renderer ISN'T asking for the URL (e.g.
    // canvas paused), no check runs, but there's also no flash to
    // worry about because nothing's drawing.
    applySeekBeforeEnd(v)
    return v
  }
  v = document.createElement('video')
  v.src = url
  v.muted = true
  v.loop = true
  v.playsInline = true
  // crossOrigin is required so canvas.drawImage(video) doesn't taint
  // the canvas (which would block captureStream() / toBlob() for
  // export). Supabase Storage public buckets serve the right CORS
  // headers; if a custom CDN ever fronts these URLs, it MUST set
  // Access-Control-Allow-Origin or exports break silently.
  v.crossOrigin = 'anonymous'
  v.preload = 'auto'
  v.load()
  // play() can reject (autoplay policy, decoding failure). Muted
  // playback is widely allowed; we swallow the rejection because the
  // background isn't critical to user-initiated interaction.
  void v.play().catch(() => {})
  pool.set(url, v)
  return v
}

/**
 * Tear down a pool entry. The current background renderer doesn't
 * call this — library URLs are stable and we KEEP elements live
 * because switching backgrounds usually means switching between a
 * handful of choices. Exposed for completeness / future cleanup
 * pressure (e.g. a "clear unused library entries" pass).
 */
export function releaseLibraryVideo(url: string): void {
  const v = pool.get(url)
  if (v) {
    try {
      v.pause()
      v.removeAttribute('src')
      v.load()
    } catch {
      /* ignore */
    }
    pool.delete(url)
  }
}

/**
 * Snapshot for diagnostics. Currently unused in production — handy
 * during development to see the pool size when chasing memory growth.
 */
export function getLibraryPoolSize(): number {
  return pool.size
}
