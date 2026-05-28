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
 * Get the pooled video element for `url`, creating + starting playback
 * on first request. Safe to call from a render loop; idempotent after
 * first call.
 */
export function getOrLoadLibraryVideo(url: string): HTMLVideoElement {
  let v = pool.get(url)
  if (v) return v
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
