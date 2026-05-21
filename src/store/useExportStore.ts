import { create } from 'zustand'
import {
  DEFAULT_RECORDING_OPTIONS,
  DEFAULT_RECORDING_STATE,
  getSupportedMimeType,
  type RecordingOptions,
  type RecordingState,
} from '@/lib/recorder'

export interface ExportStore {
  isOpen: boolean
  state: RecordingState
  options: RecordingOptions
  open: () => void
  close: () => void
  setOptions: (opts: Partial<RecordingOptions>) => void
  setState: (s: Partial<RecordingState>) => void
  reset: () => void
}

// Detect the best supported mime at module load so the default reflects
// the browser. SSR / non-MediaRecorder envs fall back to the default.
const initialOptions: RecordingOptions = {
  ...DEFAULT_RECORDING_OPTIONS,
  mimeType:
    typeof MediaRecorder !== 'undefined'
      ? getSupportedMimeType()
      : DEFAULT_RECORDING_OPTIONS.mimeType,
}

export const useExportStore = create<ExportStore>((set, get) => ({
  isOpen: false,
  state: { ...DEFAULT_RECORDING_STATE },
  options: initialOptions,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  setOptions: (opts) => set((s) => ({ options: { ...s.options, ...opts } })),

  setState: (s) => set((prev) => ({ state: { ...prev.state, ...s } })),

  reset: () => {
    // Revoke the previous blobUrl so we don't leak the recorded video.
    const prevBlobUrl = get().state.blobUrl
    if (prevBlobUrl) URL.revokeObjectURL(prevBlobUrl)
    set({ state: { ...DEFAULT_RECORDING_STATE } })
  },
}))
