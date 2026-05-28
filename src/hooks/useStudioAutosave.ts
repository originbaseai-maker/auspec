import { useEffect, useRef } from 'react'
import { useLayerStore } from '@/store/useLayerStore'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { useProjectStore } from '@/store/useProjectStore'
import { saveStudioState } from '@/lib/studioPersistence'

/**
 * Debounce window for autosave writes. Long enough that a slider
 * drag (firing ~60 changes/sec) coalesces into one write; short
 * enough that a tab close after a single edit lands the work.
 * Set in one place so future tuning is a single edit.
 */
const AUTOSAVE_DEBOUNCE_MS = 500

/**
 * Subscribes to the three stores that hold authoritative Studio state
 * (layers, visualizer config + active preset, active Supabase
 * project) and writes a debounced snapshot to localStorage on every
 * meaningful change.
 *
 * Mount this once near the root of StudioPage. Returns nothing — the
 * snapshot is restored by a separate one-shot call in StudioPage's
 * mount effect so we don't double-restore during HMR.
 */
export function useStudioAutosave(enabled: boolean = true): void {
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    const flush = () => {
      const layerState = useLayerStore.getState()
      const vizState = useVisualizerStore.getState()
      const projState = useProjectStore.getState()
      saveStudioState({
        layers: layerState.layers,
        activeLayerId: layerState.activeLayerId,
        draftLayer: layerState.draftLayer,
        draftIsDirty: layerState.draftIsDirty,
        activePresetId: vizState.activePresetId,
        visualizerConfig: vizState.visualizerConfig,
        visualType: vizState.visualType,
        backgroundColor: vizState.backgroundColor,
        sensitivity: vizState.sensitivity,
        activeProjectId: projState.activeProjectId,
      })
    }

    const schedule = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        flush()
      }, AUTOSAVE_DEBOUNCE_MS)
    }

    // Subscribe to each store. Zustand's subscribe fires on every
    // state mutation — the debounce coalesces slider/drag bursts so
    // localStorage isn't hit per frame.
    const unsubLayers = useLayerStore.subscribe(schedule)
    const unsubViz = useVisualizerStore.subscribe(schedule)
    const unsubProj = useProjectStore.subscribe(schedule)

    // Persist on tab close so the very last edit isn't stranded in
    // the debounce timer. `beforeunload` is reliable enough on
    // modern browsers; mobile background tabs may fire `pagehide`
    // instead, so we listen to both.
    const flushNow = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      flush()
    }
    window.addEventListener('beforeunload', flushNow)
    window.addEventListener('pagehide', flushNow)

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      unsubLayers()
      unsubViz()
      unsubProj()
      window.removeEventListener('beforeunload', flushNow)
      window.removeEventListener('pagehide', flushNow)
    }
  }, [enabled])
}
