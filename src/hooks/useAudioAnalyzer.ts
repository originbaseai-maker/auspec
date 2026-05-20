import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioStore } from '@/store/useAudioStore'
import {
  AnalyzerEngine,
  DEFAULT_ANALYZER_CONFIG,
  connectMediaElement,
  resumeAudioContext,
} from '@/lib/audio'
import type { AnalyzerConfig, FrequencyData } from '@/types/analyzer'

export interface UseAudioAnalyzerResult {
  frequencyData: FrequencyData | null
  isAnalyzing: boolean
  analyzerConfig: AnalyzerConfig
  updateConfig: (config: Partial<AnalyzerConfig>) => void
}

export function useAudioAnalyzer(): UseAudioAnalyzerResult {
  const audioElement = useAudioStore((s) => s.audioElement)
  const isPlaying = useAudioStore((s) => s.isPlaying)
  const [frequencyData, setFrequencyData] = useState<FrequencyData | null>(null)
  const [analyzerConfig, setAnalyzerConfig] = useState<AnalyzerConfig>(
    DEFAULT_ANALYZER_CONFIG,
  )
  const engineRef = useRef<AnalyzerEngine | null>(null)

  useEffect(() => {
    if (!audioElement || !isPlaying) {
      engineRef.current?.stop()
      if (!isPlaying) setFrequencyData(null)
      return
    }

    void resumeAudioContext()

    const { analyser } = connectMediaElement(audioElement)

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
  }, [audioElement, isPlaying])

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
