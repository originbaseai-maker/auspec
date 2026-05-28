import { useEffect, useRef, type JSX } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import { useMasterClock } from '@/lib/masterClock'

/**
 * Bridges a video element's playback events into useAudioStore when
 * the master clock IS that video (no uploaded audio file). Mounts
 * the same set of listeners useAudioPlayer attaches to the <audio>
 * tag — play/pause/timeupdate/durationchange/ended — so transport
 * controls in Timeline and the analyser hook continue to read
 * `isPlaying`, `currentTime`, and `duration` from the store
 * without caring which media kind is actually driving them.
 *
 * Renders no DOM. Mounted by StudioPage when the audio-only path is
 * inactive but a video clock is available. When the audio file path
 * takes over (user uploads a track), this component unmounts and
 * useAudioPlayer's listeners take over with zero overlap.
 *
 * Trim semantics: useAudioStore.trimStart / trimEnd are TIMELINE
 * trim (not per-layer video trim). They carry over from a previous
 * audio session as-is; if they exceed the video's duration the
 * end-of-track handler clamps them at runtime.
 */
export function VideoClock(): JSX.Element | null {
  const clock = useMasterClock()
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying)
  const setCurrentTime = useAudioStore((s) => s.setCurrentTime)
  const setDuration = useAudioStore((s) => s.setDuration)
  // Stash the audio source field so the muted-discipline effect runs
  // on toggle without us needing a separate render-time subscription.
  const audioSource = useAudioStore((s) => s.audioSource)

  // Track the element we wired listeners to so a clock swap (e.g.
  // user selects a different video in AudioSourceToggle) cleanly
  // tears the previous one down.
  const wiredRef = useRef<HTMLMediaElement | null>(null)

  useEffect(() => {
    if (clock.kind !== 'video' || !clock.element) {
      // Not the active clock — make sure any previously-wired video
      // gets its listeners removed so the store doesn't keep getting
      // updates from a phantom source.
      const prev = wiredRef.current
      if (prev) {
        wiredRef.current = null
        // No teardown variables in scope — the inner-cleanup return
        // below handles it on the listener-bound path.
        void prev
      }
      return
    }

    const video = clock.element
    wiredRef.current = video

    // Sync duration once on mount in case durationchange already
    // fired before listeners attached (videos with metadata-cached
    // durations land here on first paint).
    if (video.duration && isFinite(video.duration)) {
      setDuration(video.duration)
    }
    // Same for currentTime — the analyser's first frame happens
    // before any 'timeupdate' fires, so seed the store directly.
    setCurrentTime(video.currentTime || 0)

    const onTimeUpdate = () => {
      const t = video.currentTime
      setCurrentTime(t)
      const { trimStart, trimEnd, loop } = useAudioStore.getState()
      // Trim-aware end-of-window behaviour matches the <audio> path
      // in useAudioPlayer so the user's trim controls work the same
      // way regardless of clock kind.
      if (trimEnd !== null && t >= trimEnd) {
        if (loop) {
          try {
            video.currentTime = trimStart
          } catch {
            /* element not seekable yet */
          }
        } else {
          video.pause()
          setIsPlaying(false)
        }
      }
    }
    const onDurationChange = () => {
      if (isFinite(video.duration)) setDuration(video.duration)
    }
    const onEnded = () => {
      const { loop, trimStart } = useAudioStore.getState()
      if (loop) {
        try {
          video.currentTime = trimStart
          void video.play()
        } catch {
          /* ignore */
        }
        return
      }
      setIsPlaying(false)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('ended', onEnded)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      // Mirror the <audio> path: don't pause the element on cleanup —
      // a clock swap might just be re-attaching listeners to the same
      // video. The useAudioPlayer takeover path pauses explicitly via
      // useAudioStore.cleanup() when needed.
    }
  }, [clock.kind, clock.element, setCurrentTime, setDuration, setIsPlaying])

  // Mute discipline: when the master clock IS a video and the user
  // has 'video' selected as the audio source, the clock video must
  // be UNMUTED (it's the audible track + the analyser source). The
  // VisualizerCanvas video-sync effect already handles this case
  // for the active-asset video, but redundantly setting it here
  // guards against a brief muted frame on first play.
  useEffect(() => {
    if (clock.kind !== 'video' || !clock.element) return
    if (audioSource === 'video') {
      clock.element.muted = false
    }
  }, [clock.kind, clock.element, audioSource])

  return null
}

export default VideoClock
