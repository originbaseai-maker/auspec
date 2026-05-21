import { createContext, useContext, type ReactNode } from 'react'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import type { AnalyzerConfig, FrequencyData } from '@/types/analyzer'

export interface AnalyzerContextValue {
  frequencyData: FrequencyData | null
  isAnalyzing: boolean
  analyzerConfig: AnalyzerConfig
  updateConfig: (config: Partial<AnalyzerConfig>) => void
}

export const AnalyzerContext = createContext<AnalyzerContextValue | null>(null)

export function AnalyzerProvider({ children }: { children: ReactNode }) {
  const analyzer = useAudioAnalyzer()
  return (
    <AnalyzerContext.Provider value={analyzer}>
      {children}
    </AnalyzerContext.Provider>
  )
}

export function useAnalyzer(): AnalyzerContextValue {
  const ctx = useContext(AnalyzerContext)
  if (!ctx) throw new Error('useAnalyzer must be used inside AnalyzerProvider')
  return ctx
}
