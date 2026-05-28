import { useCallback, useEffect, useRef } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import { getMasterClock } from '@/lib/masterClock'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    audioFile,
    setAudioElement,
    audioSource,
  } = useAudioStore()

  // Mute discipline: the audio element is audible only when 'music'
  // is the chosen source. In every other case the user wants the
  // video's audio (or there's no audio at all). The element keeps
  // existing — it's the master clock when source='music' — but its
  // output route is muted to prevent double-audio.
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.muted = audioSource !== 'music'
  }, [audioSource])

  useEffect(() => {
    // Only the instance that actually owns the audio element should write
    // to the store. Other consumers (e.g. an old call site that no longer
    // renders <audio>) must NOT overwrite the live element with null.
    if (!audioRef.current) return
    setAudioElement(audioRef.current)
    return () => setAudioElement(null)
  }, [setAudioElement])

  useEffect(() => {
    if (!audioRef.current || !audioFile) return
    audioRef.current.src = audioFile.objectUrl
    audioRef.current.load()
  }, [audioFile?.objectUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Listener-gating rule: only fire store writes when THIS element
    // is the current master clock. With music+video and source=video,
    // both this element and the video have play/timeupdate events
    // firing — without the gate they'd race to update `isPlaying` /
    // `currentTime`. The gate makes the non-master a silent passenger.
    const isMaster = () => getMasterClock().element === audio
    const onTimeUpdate = () => {
      if (!isMaster()) return
      const t = audio.currentTime
      setCurrentTime(t)

      const { trimStart, trimEnd, loop } = useAudioStore.getState()

      if (trimEnd !== null && t >= trimEnd) {
        if (loop) {
          audio.currentTime = trimStart
        } else {
          audio.pause()
          setIsPlaying(false)
        }
      }
    }
    const onDurationChange = () => {
      if (!isMaster()) return
      setDuration(audio.duration)
    }
    const onEnded = () => {
      if (!isMaster()) return
      const { loop, trimStart } = useAudioStore.getState()
      if (loop) {
        // Restart from trimStart (or 0 if no trim was set). The play/pause
        // event listeners below will sync isPlaying for us.
        audio.currentTime = trimStart
        void audio.play()
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

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [setCurrentTime, setDuration, setIsPlaying])

  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const { trimStart } = useAudioStore.getState()
    if (audio.currentTime < trimStart) audio.currentTime = trimStart
    void audio.play()
    setIsPlaying(true)
  }, [setIsPlaying])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    setIsPlaying(false)
  }, [setIsPlaying])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) pause()
    else play()
  }, [isPlaying, pause, play])

  const seek = useCallback(
    (time: number) => {
      if (!audioRef.current) return
      audioRef.current.currentTime = time
      setCurrentTime(time)
    },
    [setCurrentTime],
  )

  const handleVolume = useCallback(
    (vol: number) => {
      if (!audioRef.current) return
      audioRef.current.volume = vol
      setVolume(vol)
    },
    [setVolume],
  )

  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    play,
    pause,
    togglePlay,
    seek,
    setVolume: handleVolume,
    formatTime,
  }
}
