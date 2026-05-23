import { useState, type JSX } from 'react'
import { History, Sparkles } from 'lucide-react'
import { useAIStore } from '@/store/useAIStore'

const QUICK_PROMPTS = [
  { icon: '🌌', label: 'Cosmic vibes' },
  { icon: '🔥', label: 'Aggressive fire' },
  { icon: '🎲', label: 'Surprise me' },
]

export function AIZone(): JSX.Element {
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

  const handleQuick = (text: string) => {
    setPrompt(text)
  }

  return (
    <div
      className="relative shrink-0 border-t p-3"
      style={{
        borderColor: '#1a1a1a',
        background: 'linear-gradient(180deg, #0a0a0a, #050505)',
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), rgba(236,72,153,0.4), rgba(139,92,246,0.4), transparent)',
        }}
        aria-hidden="true"
      />

      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
          >
            <Sparkles className="h-3 w-3 text-white" aria-hidden="true" />
          </div>
          <span
            className="text-[11px] font-semibold tracking-wider"
            style={{ color: '#f59e0b' }}
          >
            AI STYLE
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          aria-label={showHistory ? 'Hide AI history' : 'Show AI history'}
          aria-pressed={showHistory}
          className="rounded p-1 text-white/40 hover:text-white"
        >
          <History className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      <div
        className="rounded-lg border p-2 transition-all"
        style={{ borderColor: '#2a2a2a', background: '#131313' }}
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
          style={{ minHeight: 40, lineHeight: 1.4 }}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => handleQuick(q.label)}
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
            className="flex h-6 w-6 items-center justify-center rounded text-xs text-white transition-opacity disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
          >
            {isLoading ? '...' : '→'}
          </button>
        </div>
      </div>

      <p className="mt-2 text-center text-[9px] text-white/30">
        ✦ Coming in Phase 13
      </p>

      {showHistory && history.length > 0 && (
        <div className="mt-3 space-y-1">
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
    </div>
  )
}

export default AIZone
