import { useCallback, useEffect, useRef } from 'react'
import { useAudioStore } from '@/store/useAudioStore'

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

  // When the analyser is sampling a video's audio track, mute the
  // uploaded audio element so the user doesn't hear two streams at
  // once. The audio element keeps PLAYING — it's still the master
  // timeline clock; only its output is silenced. Restored on toggle
  // back to 'uploaded'.
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.muted = audioSource === 'video'
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

    const onTimeUpdate = () => {
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
    const onDurationChange = () => setDuration(audio.duration)
    const onEnded = () => {
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
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

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
