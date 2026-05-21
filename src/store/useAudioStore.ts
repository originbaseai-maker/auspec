import { create } from 'zustand'
import type { AudioFile } from '../types/audio'

export interface AudioStore {
  audioFile: AudioFile | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  audioElement: HTMLAudioElement | null

  setAudioFile: (file: AudioFile | null) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setAudioElement: (el: HTMLAudioElement | null) => void
  cleanup: () => void
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  audioFile: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  audioElement: null,

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
    })
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setAudioElement: (audioElement) => set({ audioElement }),

  cleanup: () => {
    const { audioFile } = get()
    if (audioFile?.objectUrl) URL.revokeObjectURL(audioFile.objectUrl)
    set({
      audioFile: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      audioElement: null,
    })
  },
}))
