import { useState, type JSX } from 'react'
import { History, Sparkles } from 'lucide-react'
import { useAIStore } from '@/store/useAIStore'

const QUICK_PROMPTS = [
  { icon: '🌌', label: 'Cosmic vibes' },
  { icon: '🔥', label: 'Aggressive fire' },
  { icon: '🎲', label: 'Surprise me' },
]

export function AIPanel(): JSX.Element {
  const prompt = useAIStore((s) => s.prompt)
  const isLoading = useAIStore((s) => s.isLoading)
  const history = useAIStore((s) => s.history)
  const setPrompt = useAIStore((s) => s.setPrompt)
  const setLoading = useAIStore((s) => s.setLoading)
  const addHistoryEntry = useAIStore((s) => s.addHistoryEntry)
  const [showHistory, setShowHistory] = useState(false)

  const handleGenerate = () => {
    const trimmed = prompt.trim()
    if (!trimmed || isLoading) return
    setLoading(true)
    window.setTimeout(() => {
      addHistoryEntry({ prompt: trimmed, result: null })
      setPrompt('')
      setLoading(false)
    }, 800)
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-md border p-3"
        style={{
          borderColor: 'rgba(245,158,11,0.2)',
          background:
            'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(236,72,153,0.05))',
        }}
      >
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-amber-400" aria-hidden="true" />
          <p className="text-[11px] font-medium text-white">
            AI-Powered Styling
          </p>
        </div>
        <p className="text-[10px] leading-relaxed text-white/50">
          Describe a vibe in plain English. AI picks colors, shapes, and
          effects to match.
        </p>
      </div>

      <div
        className="rounded-lg border p-2"
        style={{ borderColor: '#2a2a2a', background: '#0a0a0a' }}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleGenerate()
            }
          }}
          placeholder={'Describe a look...\ne.g. "Cosmic with stars"'}
          aria-label="AI style prompt"
          className="w-full resize-none bg-transparent text-[11px] text-white outline-none placeholder:text-white/30"
          style={{ minHeight: 50, lineHeight: 1.4 }}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setPrompt(q.label)}
                title={q.label}
                aria-label={q.label}
                className="rounded border px-1.5 py-0.5 text-[10px] text-white/70 hover:text-white"
                style={{
                  borderColor: '#2a2a2a',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                {q.icon}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isLoading}
            title="Coming in Phase 13"
            aria-label="Generate AI style"
            className="flex h-7 items-center justify-center rounded px-3 text-[11px] font-medium text-white transition-opacity disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
          >
            {isLoading ? '...' : 'Generate'}
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          aria-pressed={showHistory}
          className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-[10px] text-white/60 hover:text-white"
          style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
        >
          <History className="h-3 w-3" aria-hidden="true" />
          {showHistory ? 'Hide' : 'Show'} history ({history.length})
        </button>
      )}

      {showHistory && history.length > 0 && (
        <div className="space-y-1">
          {history
            .slice(-5)
            .reverse()
            .map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setPrompt(h.prompt)}
                className="block w-full cursor-pointer rounded border px-2 py-1.5 text-left text-[10px] text-white/60 hover:text-white"
                style={{
                  borderColor: 'rgba(245,158,11,0.15)',
                  background: 'rgba(245,158,11,0.04)',
                }}
              >
                · {h.prompt}
              </button>
            ))}
        </div>
      )}

      <p className="pt-2 text-center text-[9px] text-white/30">
        ✦ Coming in Phase 13
      </p>
    </div>
  )
}

export default AIPanel
