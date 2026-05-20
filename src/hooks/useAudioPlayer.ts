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
  } = useAudioStore()

  useEffect(() => {
    if (audioRef.current) setAudioElement(audioRef.current)
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

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)
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

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else void audioRef.current.play()
  }, [isPlaying])

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
    togglePlay,
    seek,
    setVolume: handleVolume,
    formatTime,
  }
}
