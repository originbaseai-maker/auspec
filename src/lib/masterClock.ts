import { useAudioStore } from '@/store/useAudioStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import { getVideoElement } from '@/lib/videoPool'
import type { VideoLayerConfig } from '@/types/layer'

/**
 * The user's chosen audio source IS the transport clock — both the
 * AnalyserNode AND the play/pause/seek surface read from the same
 * resolved element. The "three modes" mental model:
 *
 *   Music only         → only candidate is 'music'; auto-picked
 *   Video only         → only candidate is the video; auto-picked
 *   Music + Video      → user chooses via AudioSourceToggle
 *
 * The chosen source is stored in `useAudioStore.audioSource`. When
 * the chosen source isn't available (vanished, never existed), the
 * resolver falls back to the single available candidate — never
 * crashes, never returns null while a candidate exists.
 */
export interface AudioCandidate {
  /** 'music' for the uploaded audio file, or the asset id for a video. */
  id: 'music' | string
  /** User-facing label (file name, layer name). */
  label: string
  /** Live media element to play / sample / mute. */
  element: HTMLMediaElement
  /** Discriminator for downstream branching (mute discipline, icon). */
  kind: 'music' | 'video'
}

export type MasterClockKind = 'music' | 'video' | null

export interface MasterClockResolution {
  element: HTMLMediaElement | null
  kind: MasterClockKind
  /** When kind === 'video', the asset id whose element is the clock. */
  videoAssetId: string | null
}

/**
 * List every playable audio source available right now. The
 * AudioSourceToggle decides its own visibility from `length`:
 *   0 → hidden, no transport
 *   1 → hidden, auto-picked
 *   2+ → visible, user picks
 */
export function getAudioCandidates(): AudioCandidate[] {
  const audio = useAudioStore.getState()
  const layers = useLayerStore.getState().layers
  const assets = useVideoAssetStore.getState().assets
  const out: AudioCandidate[] = []

  if (audio.audioFile && audio.audioElement) {
    out.push({
      id: 'music',
      label: audio.audioFile.name,
      element: audio.audioElement,
      kind: 'music',
    })
  }

  // Top-down by zOrder so the visually-foremost video is the default
  // pick when the toggle auto-resolves. The pool entry must exist
  // (filters out layers whose asset upload is still pending).
  const sortedLayers = [...layers].sort((a, b) => b.zOrder - a.zOrder)
  for (const layer of sortedLayers) {
    if (layer.type !== 'video' || !layer.enabled) continue
    const cfg = layer.config as VideoLayerConfig
    if (!cfg.videoAssetId) continue
    const asset = assets.find((a) => a.id === cfg.videoAssetId)
    if (!asset) continue
    const el = getVideoElement(cfg.videoAssetId)
    if (!el) continue
    out.push({
      id: cfg.videoAssetId,
      label: layer.name,
      element: el,
      kind: 'video',
    })
  }
  return out
}

/**
 * Pick the candidate that should be active right now. The user's
 * stored choice wins when it maps to a live candidate; otherwise the
 * first candidate (top-of-stack video, or the music file) is used.
 *
 * Single-candidate mode: returns that candidate regardless of the
 * stored `audioSource`. This lets the user adjust the toggle in a
 * music+video session, then remove the video, and have the music
 * pick up the playback cleanly without needing the toggle to flip.
 */
export function resolveActiveCandidate(): AudioCandidate | null {
  const audio = useAudioStore.getState()
  const candidates = getAudioCandidates()
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  if (audio.audioSource === 'music') {
    const music = candidates.find((c) => c.kind === 'music')
    if (music) return music
  } else {
    const wantId = audio.videoAudioAssetId
    if (wantId) {
      const explicit = candidates.find(
        (c) => c.kind === 'video' && c.id === wantId,
      )
      if (explicit) return explicit
    }
    const anyVideo = candidates.find((c) => c.kind === 'video')
    if (anyVideo) return anyVideo
  }

  // Stored choice doesn't map to a live candidate — fall back to
  // first available so the user is never stuck with a dead pick.
  return candidates[0]
}

export function getMasterClock(): MasterClockResolution {
  const active = resolveActiveCandidate()
  if (!active) return { element: null, kind: null, videoAssetId: null }
  return {
    element: active.element,
    kind: active.kind,
    videoAssetId: active.kind === 'video' ? active.id : null,
  }
}

/**
 * React-friendly version of getMasterClock that re-renders on the
 * relevant store fields. Returns the same shape so consumers can
 * swap between imperative and reactive use without branching.
 */
export function useMasterClock(): MasterClockResolution {
  // Subscribe to every input that resolveActiveCandidate consults.
  useAudioStore((s) => s.audioElement)
  useAudioStore((s) => s.audioFile)
  useAudioStore((s) => s.audioSource)
  useAudioStore((s) => s.videoAudioAssetId)
  useLayerStore((s) => s.layers)
  useVideoAssetStore((s) => s.assets)
  return getMasterClock()
}

/** True when at least one candidate exists. */
export function useHasMasterClock(): boolean {
  return useMasterClock().element !== null
}

/** Reactive list of available candidates. */
export function useAudioCandidates(): AudioCandidate[] {
  useAudioStore((s) => s.audioElement)
  useAudioStore((s) => s.audioFile)
  useLayerStore((s) => s.layers)
  useVideoAssetStore((s) => s.assets)
  return getAudioCandidates()
}

export interface AnalyserSourceResolution {
  element: HTMLMediaElement | null
  /** True when the element is a video (drives the mute discipline). */
  isVideo: boolean
  /** The video asset id when isVideo === true. */
  videoAssetId: string | null
}

/**
 * Same single-source-of-truth shape as the master clock — the
 * analyser routing and the transport clock are deliberately the
 * same element. Kept as a separate function so callers (mute logic,
 * useAudioAnalyzer) can branch on `isVideo` without re-deriving it.
 */
export function resolveAnalyserSource(): AnalyserSourceResolution {
  const active = resolveActiveCandidate()
  if (!active) return { element: null, isVideo: false, videoAssetId: null }
  return {
    element: active.element,
    isVideo: active.kind === 'video',
    videoAssetId: active.kind === 'video' ? active.id : null,
  }
}
