import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import { AnalyzerEngine } from '@/lib/analyzerEngine'
import { connectMediaElement, resumeAudioContext } from '@/lib/audioContext'
import { getVideoElement } from '@/lib/videoPool'
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
  const audioElement = useAudioStore((s) => s.audioElement)
  const isPlaying = useAudioStore((s) => s.isPlaying)
  const audioSource = useAudioStore((s) => s.audioSource)
  const videoAudioAssetId = useAudioStore((s) => s.videoAudioAssetId)
  const [frequencyData, setFrequencyData] = useState<FrequencyData | null>(null)
  const [analyzerConfig, setAnalyzerConfig] = useState<AnalyzerConfig>(
    DEFAULT_ANALYZER_CONFIG,
  )
  const engineRef = useRef<AnalyzerEngine | null>(null)

  useEffect(() => {
    // Resolve the live media element the analyser should sample:
    //   'video' source AND a registered assetId → the pooled video
    //   anything else → the uploaded audio element
    // The audio element keeps playing silently as the master clock
    // (so trim handles, play/pause, scrubbing all behave the same)
    // — only the analyser routing changes.
    const videoEl =
      audioSource === 'video' && videoAudioAssetId
        ? getVideoElement(videoAudioAssetId)
        : null
    const element: HTMLMediaElement | null = videoEl ?? audioElement

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
  }, [audioElement, isPlaying, audioSource, videoAudioAssetId])

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
