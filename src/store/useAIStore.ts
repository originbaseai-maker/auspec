import { create } from 'zustand'

const HISTORY_STORAGE_KEY = 'auspec-ai-history'
const HISTORY_LIMIT = 20

export interface AIHistoryEntry {
  id: string
  prompt: string
  result: string | null
  ts: number
}

export interface AIStore {
  prompt: string
  isLoading: boolean
  history: AIHistoryEntry[]
  setPrompt: (p: string) => void
  setLoading: (b: boolean) => void
  addHistoryEntry: (entry: { prompt: string; result: string | null }) => void
  clearHistory: () => void
}

function loadHistory(): AIHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AIHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(entries: AIHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* ignore */
  }
}

export const useAIStore = create<AIStore>((set, get) => ({
  prompt: '',
  isLoading: false,
  history: loadHistory(),

  setPrompt: (prompt) => set({ prompt }),
  setLoading: (isLoading) => set({ isLoading }),

  addHistoryEntry: ({ prompt, result }) => {
    const entry: AIHistoryEntry = {
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      prompt,
      result,
      ts: Date.now(),
    }
    const next = [...get().history, entry].slice(-HISTORY_LIMIT)
    saveHistory(next)
    set({ history: next })
  },

  clearHistory: () => {
    saveHistory([])
    set({ history: [] })
  },
}))
