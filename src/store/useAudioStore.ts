import { create } from 'zustand'
import type { AudioFile } from '../types/audio'
import { useTextStore } from './useTextStore'

export interface AudioStore {
  audioFile: AudioFile | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  audioElement: HTMLAudioElement | null
  trimStart: number
  trimEnd: number | null
  loop: boolean
  previewMode: boolean

  setAudioFile: (file: AudioFile | null) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setAudioElement: (el: HTMLAudioElement | null) => void
  setTrimStart: (s: number) => void
  setTrimEnd: (s: number | null) => void
  resetTrim: () => void
  setLoop: (loop: boolean) => void
  setPreviewMode: (b: boolean) => void
  cleanup: () => void
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  audioFile: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  audioElement: null,
  trimStart: 0,
  trimEnd: null,
  loop: false,
  previewMode: true,

  setAudioFile: (audioFile) => {
    const prev = get().audioFile
    if (prev && prev.objectUrl && prev.objectUrl !== audioFile?.objectUrl) {
      URL.revokeObjectURL(prev.objectUrl)
    }
    set({
      audioFile,
      isPlaying: false,
      currentTime: 0,
      duration: audioFile?.duration ?? 0,
      trimStart: 0,
      trimEnd: null,
      loop: false,
    })

    // Best-effort autofill of the Text overlay from "Artist - Title.ext".
    // Only fires on file SET (audioFile truthy); clearing audio leaves any
    // user-customized text alone so they don't lose work on file swap.
    if (audioFile) {
      const baseName = audioFile.name.replace(/\.[^/.]+$/, '')
      const parts = baseName.split(' - ').map((s) => s.trim())
      const textStore = useTextStore.getState()
      if (parts.length >= 2 && parts[0] && parts[1]) {
        textStore.setLayer('artist', { text: parts[0], enabled: true })
        textStore.setLayer('title', {
          text: parts.slice(1).join(' - '),
          enabled: true,
        })
      } else {
        textStore.setLayer('title', { text: baseName, enabled: true })
      }
    }
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setAudioElement: (audioElement) => set({ audioElement }),
  setTrimStart: (trimStart) => set({ trimStart: Math.max(0, trimStart) }),
  setTrimEnd: (trimEnd) => set({ trimEnd }),
  resetTrim: () => set({ trimStart: 0, trimEnd: null }),
  setLoop: (loop) => set({ loop }),
  setPreviewMode: (previewMode) => set({ previewMode }),

  cleanup: () => {
    const { audioFile } = get()
    if (audioFile?.objectUrl) URL.revokeObjectURL(audioFile.objectUrl)
    set({
      audioFile: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      audioElement: null,
      trimStart: 0,
      trimEnd: null,
      loop: false,
    })
  },
}))
