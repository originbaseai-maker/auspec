import { useEffect, useRef, type JSX } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import { getMasterClock, useMasterClock } from '@/lib/masterClock'

/**
 * Bridges a video element's playback events into useAudioStore for
 * whichever video is the current master clock. Mirrors the listener
 * stack useAudioPlayer attaches to the <audio> tag — play / pause /
 * timeupdate / durationchange / ended — so transport controls in
 * Timeline and the analyser hook continue to read `isPlaying`,
 * `currentTime`, and `duration` from the store without caring which
 * media kind is driving them.
 *
 * Mounts whenever masterClock.kind === 'video'. This includes both:
 *   - "Video only" mode (no music file, video is the only source)
 *   - "Music + Video, source=video" mode (the user toggled the
 *     analyser to read the video; music plays muted as a passenger
 *     and its useAudioPlayer listeners no-op via their master-check)
 *
 * Listener writes are gated by a `isMaster()` check on every fire —
 * if a clock swap happens mid-callback (toggle in flight) the
 * non-master video silently drops its update instead of racing
 * useAudioPlayer.
 */
export function VideoClock(): JSX.Element | null {
  const clock = useMasterClock()
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying)
  const setCurrentTime = useAudioStore((s) => s.setCurrentTime)
  const setDuration = useAudioStore((s) => s.setDuration)

  // Track the element we wired listeners to so a clock swap cleanly
  // tears the previous one down.
  const wiredRef = useRef<HTMLMediaElement | null>(null)

  useEffect(() => {
    if (clock.kind !== 'video' || !clock.element) {
      wiredRef.current = null
      return
    }
    const video = clock.element
    wiredRef.current = video

    // Seed the store from the video's current values so the first
    // frame of the analyser run has correct currentTime / duration
    // without waiting for the next timeupdate.
    if (video.duration && isFinite(video.duration)) {
      setDuration(video.duration)
    }
    setCurrentTime(video.currentTime || 0)

    const isMaster = () => getMasterClock().element === video
    const onTimeUpdate = () => {
      if (!isMaster()) return
      const t = video.currentTime
      setCurrentTime(t)
      const { trimStart, trimEnd, loop } = useAudioStore.getState()
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
      if (!isMaster()) return
      if (isFinite(video.duration)) setDuration(video.duration)
    }
    const onEnded = () => {
      if (!isMaster()) return
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
    const onPlay = () => {
      if (!isMaster()) return
      setIsPlaying(true)
    }
    const onPause = () => {
      if (!isMaster()) return
      setIsPlaying(false)
    }

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
      // Mirror the <audio> path: don't pause on cleanup — a clock
      // swap may just be re-attaching listeners to the same video.
      // The MasterClockSync hook handles the pause-then-resume
      // handover when the master ELEMENT changes.
    }
  }, [clock.kind, clock.element, setCurrentTime, setDuration, setIsPlaying])

  return null
}

export default VideoClock
