import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useVideoAssetStore } from '@/store/useVideoAssetStore'
import { AnalyzerEngine } from '@/lib/analyzerEngine'
import { connectMediaElement, resumeAudioContext } from '@/lib/audioContext'
import { resolveAnalyserSource } from '@/lib/masterClock'
import {
  DEFAULT_ANALYZER_CONFIG,
  type AnalyzerConfig,
  type FrequencyData,
} from '@/types/analyzer'

export interface UseAudioAnalyzerResult {
  frequencyData: FrequencyData | null
  isAnalyzing: boolean
  analyzerConfig: AnalyzerConfig
  updateConfig: (config: Partial<AnalyzerConfig>) => void
}

export function useAudioAnalyzer(): UseAudioAnalyzerResult {
  // Subscribe to every store field that resolveAnalyserSource reads,
  // so the effect re-runs when ANY of them change. The hook itself
  // resolves the source via the shared helper to keep the logic
  // identical to other consumers (e.g. VisualizerCanvas mute logic).
  const audioElement = useAudioStore((s) => s.audioElement)
  const isPlaying = useAudioStore((s) => s.isPlaying)
  const audioSource = useAudioStore((s) => s.audioSource)
  const videoAudioAssetId = useAudioStore((s) => s.videoAudioAssetId)
  const layers = useLayerStore((s) => s.layers)
  const assets = useVideoAssetStore((s) => s.assets)
  const [frequencyData, setFrequencyData] = useState<FrequencyData | null>(null)
  const [analyzerConfig, setAnalyzerConfig] = useState<AnalyzerConfig>(
    DEFAULT_ANALYZER_CONFIG,
  )
  const engineRef = useRef<AnalyzerEngine | null>(null)

  useEffect(() => {
    // Source priority — see resolveAnalyserSource:
    //   1. Explicit 'video' source with valid asset.
    //   2. Uploaded audio element (the common case).
    //   3. Master-clock video fallback — kicks in when the user has
    //      no audio file but a Video layer is the clock, so the
    //      analyser keeps feeding visualisers instead of starving.
    const { element } = resolveAnalyserSource()

    if (!element || !isPlaying) {
      engineRef.current?.stop()
      if (!isPlaying) setFrequencyData(null)
      return
    }

    void resumeAudioContext()

    // connectMediaElement caches the SourceNode per element (via a
    // WeakMap), so flipping audioSource between 'uploaded' and
    // 'video' multiple times never re-invokes createMediaElementSource
    // on the same element (which would throw InvalidStateError).
    const { analyser } = connectMediaElement(element)

    if (!engineRef.current) {
      engineRef.current = new AnalyzerEngine(
        analyser,
        analyzerConfig,
        (data) => setFrequencyData(data),
      )
    }

    engineRef.current.start()

    return () => {
      engineRef.current?.stop()
    }
  }, [
    audioElement,
    isPlaying,
    audioSource,
    videoAudioAssetId,
    layers,
    assets,
  ])

  const updateConfig = useCallback((config: Partial<AnalyzerConfig>) => {
    setAnalyzerConfig((prev) => {
      const next = { ...prev, ...config }
      engineRef.current?.updateConfig(next)
      return next
    })
  }, [])

  return {
    frequencyData,
    isAnalyzing: engineRef.current?.isRunning() ?? false,
    analyzerConfig,
    updateConfig,
  }
}
