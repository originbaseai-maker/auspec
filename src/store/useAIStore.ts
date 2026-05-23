import { create } from 'zustand'

interface AIHistoryEntry {
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

const STORAGE_KEY = 'auspec-ai-history'
const MAX_HISTORY = 20

function loadHistory(): AIHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(h: AIHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(-MAX_HISTORY)))
  } catch {
    // Quota exceeded / privacy mode — history is best-effort, not load-bearing.
  }
}

export const useAIStore = create<AIStore>((set, get) => ({
  prompt: '',
  isLoading: false,
  history: loadHistory(),

  setPrompt: (prompt) => set({ prompt }),
  setLoading: (isLoading) => set({ isLoading }),

  addHistoryEntry: (entry) => {
    const newEntry: AIHistoryEntry = {
      id: `ai-${Date.now()}`,
      prompt: entry.prompt,
      result: entry.result,
      ts: Date.now(),
    }
    const next = [...get().history, newEntry].slice(-MAX_HISTORY)
    saveHistory(next)
    set({ history: next })
  },

  clearHistory: () => {
    saveHistory([])
    set({ history: [] })
  },
}))
