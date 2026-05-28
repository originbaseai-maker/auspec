import { useEffect, useRef } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import { useMasterClock } from '@/lib/masterClock'

/**
 * Orchestrates handover between two master-clock elements when the
 * user changes the audio source (e.g. toggles music ↔ video while
 * playing). Without this, switching mid-playback would leave the
 * previous element still playing — wrong audio source generates
 * timeupdate events, the listener gate in useAudioPlayer / VideoClock
 * drops them, but the user keeps hearing the wrong stream.
 *
 * Behaviour: when the master clock element CHANGES:
 *   1. Sync the new element to the store's currentTime so the
 *      visible playhead doesn't jump.
 *   2. If `isPlaying` was true, resume play on the new element.
 *   3. Pause the previous element so it stops driving audio.
 *
 * Reads isPlaying / currentTime from the live store (not deps) so
 * the effect fires only on element identity changes, not on every
 * timeupdate tick.
 */
export function useMasterClockSync(): void {
  const clock = useMasterClock()
  const prevElementRef = useRef<HTMLMediaElement | null>(null)

  useEffect(() => {
    if (clock.element === prevElementRef.current) return
    const prev = prevElementRef.current
    prevElementRef.current = clock.element

    // Pause the previous element FIRST so we never have two streams
    // generating audio simultaneously during the swap window. The
    // pause() call is synchronous; play() on the new master happens
    // immediately after so the user-perceived gap is one frame.
    if (prev && prev !== clock.element && !prev.paused) {
      try {
        prev.pause()
      } catch {
        /* ignore */
      }
    }

    if (clock.element) {
      const { currentTime, isPlaying } = useAudioStore.getState()
      // Seek the new master to the existing playhead so the user
      // doesn't see the time jump on swap.
      try {
        if (Math.abs(clock.element.currentTime - currentTime) > 0.1) {
          clock.element.currentTime = currentTime
        }
      } catch {
        /* element not seekable yet — durationchange will catch up */
      }
      if (isPlaying) {
        // .play() can reject if the browser autoplay policy stalls
        // it (rare for muted videos, can happen for audio without a
        // user gesture). The Timeline play button is always
        // user-initiated, so we should be safe here either way.
        void clock.element.play().catch(() => {})
      }
    }
  }, [clock.element])
}
