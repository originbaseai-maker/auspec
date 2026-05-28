import { useAudioStore } from '@/store/useAudioStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import { getVideoElement } from '@/lib/videoPool'
import type { VideoLayerConfig } from '@/types/layer'

/**
 * Single source of truth for "which media element drives the
 * transport." Priority:
 *   1. The uploaded audio element when an audio file is loaded —
 *      audio always wins, so adding an audio file mid-session takes
 *      over cleanly.
 *   2. The active audio-source video's pooled element when no audio
 *      file is present but the user has at least one Video layer
 *      with an audio track. The video's own audio drives both the
 *      analyser AND the timeline clock.
 *   3. Null — neither path is available, no transport surface is
 *      shown.
 *
 * Read this with `getMasterClock()` from imperative handlers (event
 * callbacks) and `useMasterClock()` from React render code.
 */
export type MasterClockKind = 'audio' | 'video' | null

export interface MasterClockResolution {
  element: HTMLMediaElement | null
  kind: MasterClockKind
  /**
   * When kind === 'video', the asset id whose element is the clock.
   * Surfaced so consumers (e.g. the timeline) can read the asset's
   * duration without re-resolving.
   */
  videoAssetId: string | null
}

/**
 * Imperative resolver. Reads the live stores. Safe to call from
 * event listeners — does not subscribe.
 */
export function getMasterClock(): MasterClockResolution {
  const audio = useAudioStore.getState()
  if (audio.audioFile && audio.audioElement) {
    return { element: audio.audioElement, kind: 'audio', videoAssetId: null }
  }
  const videoEl = resolveAudioSourceVideo()
  if (videoEl) {
    return {
      element: videoEl.element,
      kind: 'video',
      videoAssetId: videoEl.assetId,
    }
  }
  return { element: null, kind: null, videoAssetId: null }
}

interface ResolvedVideo {
  element: HTMLVideoElement
  assetId: string
}

/**
 * Find the video that's eligible to be the audio-source clock.
 * Respects an explicit selection in `audioStore.videoAudioAssetId`
 * when it still maps to a live video; otherwise picks the topmost
 * enabled Video layer (highest zOrder) whose asset is in the pool
 * and (best-effort) has an audio track.
 */
function resolveAudioSourceVideo(): ResolvedVideo | null {
  const audio = useAudioStore.getState()
  const layers = useLayerStore.getState().layers
  const assets = useVideoAssetStore.getState().assets

  // Build the candidate list: enabled Video layers referencing a
  // registered asset whose pooled element is live.
  const candidates: ResolvedVideo[] = []
  const sorted = [...layers].sort((a, b) => b.zOrder - a.zOrder)
  for (const layer of sorted) {
    if (layer.type !== 'video' || !layer.enabled) continue
    const cfg = layer.config as VideoLayerConfig
    if (!cfg.videoAssetId) continue
    if (!assets.find((a) => a.id === cfg.videoAssetId)) continue
    const el = getVideoElement(cfg.videoAssetId)
    if (!el) continue
    candidates.push({ element: el, assetId: cfg.videoAssetId })
  }
  if (candidates.length === 0) return null

  // Honour an explicit pick if it's still valid.
  if (audio.videoAudioAssetId) {
    const explicit = candidates.find(
      (c) => c.assetId === audio.videoAudioAssetId,
    )
    if (explicit) return explicit
  }
  return candidates[0]
}

/**
 * React-friendly version of getMasterClock that re-renders on the
 * relevant store fields. Returns the same resolution shape so
 * consumers can swap between imperative and reactive use without
 * branching.
 */
export function useMasterClock(): MasterClockResolution {
  // Subscribing to each input field forces a re-resolve when any of
  // them changes. The returned values aren't read directly — the
  // resolver re-reads the live store — but the subscriptions are
  // what give this hook its reactivity.
  useAudioStore((s) => s.audioElement)
  useAudioStore((s) => s.audioFile)
  useAudioStore((s) => s.videoAudioAssetId)
  useLayerStore((s) => s.layers)
  useVideoAssetStore((s) => s.assets)
  return getMasterClock()
}

/**
 * True when at least ONE valid clock source exists. Used by the
 * StudioPage render condition to decide whether to mount the
 * Timeline (vs the no-source AudioPlayerBar upload prompt).
 */
export function useHasMasterClock(): boolean {
  return useMasterClock().element !== null
}

export interface AnalyserSourceResolution {
  element: HTMLMediaElement | null
  /** True when the element is a video (drives the mute discipline). */
  isVideo: boolean
  /** The video asset id when isVideo === true. */
  videoAssetId: string | null
}

/**
 * Which element should the visualiser AnalyserNode sample?
 *
 * 1. Explicit `audioSource === 'video'` with a valid asset → that
 *    video (even if an audio file is also loaded; this is the
 *    "play music video, analyse its audio" path).
 * 2. The uploaded audio element if one is loaded.
 * 3. Fallback to the master-clock video — kicks in when the user
 *    removed an audio file mid-session, or never uploaded one and
 *    just dropped a video. Without this fallback the analyser would
 *    starve and visualisers would freeze even though a video clock
 *    is happily playing.
 */
export function resolveAnalyserSource(): AnalyserSourceResolution {
  const s = useAudioStore.getState()
  if (s.audioSource === 'video' && s.videoAudioAssetId) {
    const el = getVideoElement(s.videoAudioAssetId)
    if (el) {
      return { element: el, isVideo: true, videoAssetId: s.videoAudioAssetId }
    }
  }
  if (s.audioElement) {
    return { element: s.audioElement, isVideo: false, videoAssetId: null }
  }
  const fallback = resolveAudioSourceVideo()
  if (fallback) {
    return {
      element: fallback.element,
      isVideo: true,
      videoAssetId: fallback.assetId,
    }
  }
  return { element: null, isVideo: false, videoAssetId: null }
}
