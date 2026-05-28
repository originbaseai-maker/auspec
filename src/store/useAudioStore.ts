import { create } from 'zustand'
import type { AudioFile } from '../types/audio'
import { useLayerStore } from './useLayerStore'

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

  /**
   * Which audio stream drives the visualiser AnalyserNode.
   *   'uploaded' — the uploaded music file (current default behaviour)
   *   'video'    — a Video layer's own audio track
   * When 'video', `videoAudioAssetId` names which video asset.
   * The uploaded audio element keeps playing silently as the master
   * timeline clock (Timeline scrubs work as-is); the video element
   * gets unmuted and its createMediaElementSource feeds the analyser.
   * Toggling back to 'uploaded' restores the previous routing.
   */
  audioSource: 'uploaded' | 'video'
  videoAudioAssetId: string | null
  setAudioSource: (
    source: 'uploaded' | 'video',
    videoAudioAssetId?: string | null,
  ) => void

  /** Detected/manual BPM. 0 = none yet. */
  bpm: number
  /** 0-1 confidence in the auto-detected BPM. 1 for manual. */
  bpmConfidence: number
  /** True if `bpm` came from auto-detection (vs manual override). */
  bpmAutoDetected: boolean
  /** True while a BPM detection job is running. */
  bpmDetecting: boolean

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
  setBpm: (bpm: number, confidence?: number) => void
  setBpmManual: (bpm: number) => void
  setBpmDetecting: (b: boolean) => void
  resetBpm: () => void
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

  audioSource: 'uploaded',
  videoAudioAssetId: null,
  setAudioSource: (audioSource, videoAudioAssetId) =>
    set((s) => ({
      audioSource,
      videoAudioAssetId:
        videoAudioAssetId !== undefined
          ? videoAudioAssetId
          : s.videoAudioAssetId,
    })),

  bpm: 0,
  bpmConfidence: 0,
  bpmAutoDetected: false,
  bpmDetecting: false,

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
      // Reset BPM — useBPMDetection will repopulate when the new file
      // finishes decoding.
      bpm: 0,
      bpmConfidence: 0,
      bpmAutoDetected: false,
      bpmDetecting: false,
    })

    // Best-effort autofill of Text layers from "Artist - Title.ext".
    // Only fires on file SET. We GUARD against re-creating layers on
    // every file swap: if the user already has any text layers with
    // content, leave their work alone.
    if (audioFile) {
      const layerStore = useLayerStore.getState()
      const hasUserText = layerStore.layers.some(
        (l) => l.type === 'text' && l.config.text.trim().length > 0,
      )
      if (!hasUserText) {
        const baseName = audioFile.name.replace(/\.[^/.]+$/, '')
        const parts = baseName.split(' - ').map((s) => s.trim())

        const addText = (
          text: string,
          x: number,
          y: number,
          fontSize: number,
          rename: string,
        ): void => {
          // System-initiated: bypass the draft flow so we don't
          // surprise the user with a "Save your draft?" prompt on
          // every file change.
          const id = layerStore.addLayerImmediate('text')
          layerStore.updateConfig(id, { text, x, y, fontSize })
          layerStore.renameLayer(id, rename)
        }

        if (parts.length >= 2 && parts[0] && parts[1]) {
          addText(parts[0], 0.5, 0.92, 28, 'Artist')
          addText(parts.slice(1).join(' - '), 0.5, 0.85, 48, 'Title')
        } else {
          addText(baseName, 0.5, 0.85, 48, 'Title')
        }
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

  setBpm: (bpm, confidence = 1) =>
    set({
      bpm: Math.max(0, Math.min(300, Math.round(bpm))),
      bpmConfidence: Math.max(0, Math.min(1, confidence)),
      bpmAutoDetected: true,
    }),

  setBpmManual: (bpm) =>
    set({
      bpm: Math.max(0, Math.min(300, Math.round(bpm))),
      bpmConfidence: 1,
      bpmAutoDetected: false,
    }),

  setBpmDetecting: (bpmDetecting) => set({ bpmDetecting }),

  resetBpm: () =>
    set({
      bpm: 0,
      bpmConfidence: 0,
      bpmAutoDetected: false,
      bpmDetecting: false,
    }),

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
      bpm: 0,
      bpmConfidence: 0,
      bpmAutoDetected: false,
      bpmDetecting: false,
    })
  },
}))
